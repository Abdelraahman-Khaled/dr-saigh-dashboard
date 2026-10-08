import React, {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import {
  useEditor,
  EditorContent,
  Node,
  mergeAttributes,
  isTextSelection,
  type Editor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Typography } from "@tiptap/extension-typography";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { FontFamily } from "@tiptap/extension-font-family";
import { CharacterCount } from "@tiptap/extension-character-count";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Trash2,
  Undo2,
  Redo2,
  Baseline,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  X,
  Columns,
  Rows,
  TableCellsMerge,
  Split,
  Type,
  Video as VideoIcon,
  RemoveFormatting,
} from "lucide-react";

import "./RichTextEditor.css";

// Keep these outside the component: BubbleMenu re-dispatches its options whenever
// `shouldShow` changes identity, so inline arrows would cause an update loop.
// Text selections only: selecting a video/image node should not open the text menu.
const shouldShowTextMenu = ({ editor, from, to }: { editor: Editor; from: number; to: number }) =>
  from !== to && isTextSelection(editor.state.selection) && !editor.isActive("table");
const shouldShowTableMenu = ({ editor }: { editor: Editor }) => editor.isActive("table");

// Same cleanup the old Quill editor applied to saved HTML.
const cleanHtml = (html: string): string =>
  html ? html.replace(/&nbsp;/g, " ").replace(/\u00A0/g, " ") : html;

const ALIGN_RE = /\bql-align-(left|center|right|justify)\b/;

// Content saved by the old Quill editor uses ql-* classes that TipTap ignores.
// Convert what we can so alignment and bullet lists survive the first edit.
const normalizeLegacyHtml = (html: string): string => {
  if (!html || (!html.includes("ql-") && !html.includes("data-list"))) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.querySelectorAll(".ql-ui").forEach((el) => el.remove());
  doc.querySelectorAll<HTMLElement>('[class*="ql-align-"]').forEach((el) => {
    const match = el.className.match(ALIGN_RE);
    if (match) el.style.textAlign = match[1];
  });
  doc.querySelectorAll<HTMLElement>(".ql-direction-rtl").forEach((el) => el.setAttribute("dir", "rtl"));
  // Quill 2 internal markup: <ol><li data-list="bullet|ordered">, possibly mixed in one list
  doc.querySelectorAll("ol").forEach((list) => {
    const items = Array.from(list.children).filter((c) => c.tagName === "LI");
    if (!items.some((li) => li.hasAttribute("data-list"))) return;
    const groups: { tag: "ul" | "ol"; items: Element[] }[] = [];
    items.forEach((li) => {
      const tag = li.getAttribute("data-list") === "bullet" ? "ul" : "ol";
      li.removeAttribute("data-list");
      const last = groups[groups.length - 1];
      if (last && last.tag === tag) last.items.push(li);
      else groups.push({ tag, items: [li] });
    });
    const parent = list.parentNode;
    if (!parent) return;
    groups.forEach((g) => {
      const el = doc.createElement(g.tag);
      g.items.forEach((li) => el.appendChild(li));
      parent.insertBefore(el, list);
    });
    list.remove();
  });
  return doc.body.innerHTML;
};

// Accepts normal YouTube / Vimeo links as well as embed URLs.
const toEmbedUrl = (url: string): string | null => {
  const value = url.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  const yt = value.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return value;
};

// Video embed compatible with Quill's <iframe class="ql-video"> markup.
const VideoEmbed = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "iframe[src]",
        getAttrs: (el) => {
          const src = (el as HTMLElement).getAttribute("src") || "";
          return /^https?:\/\//i.test(src) ? { src } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(
        { class: "ql-video", frameborder: "0", allowfullscreen: "true" },
        HTMLAttributes,
      ),
    ];
  },
});

const useSharedActions = (editor: any) => {
  const addImage = useCallback(() => {
    const url = window.prompt("Enter Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter Link URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addVideo = useCallback(() => {
    const url = window.prompt("Enter Video URL (YouTube / Vimeo / embed link)");
    if (!url) return;
    const src = toEmbedUrl(url);
    if (!src) {
      window.alert("Please enter a valid http(s) URL");
      return;
    }
    editor.chain().focus().insertContent({ type: "video", attrs: { src } }).run();
  }, [editor]);

  return { addImage, setLink, addVideo };
};

interface RichTextEditorProps {
  initialContent?: string;
  initialHtml?: string;
  onContentChange?: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  showPreviewToggle?: boolean;
  showSaveButton?: boolean;
  showClearButton?: boolean;
  onSave?: (content: string) => void;
  autoSave?: boolean;
  localStorageKey?: string;
  direction?: "ltr" | "rtl";
}

const MenuBar = ({ editor }: { editor: any }) => {
  const { addImage, setLink, addVideo } = useSharedActions(editor);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-toolbar flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("bold") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("italic") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("underline") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("strike") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Strike"
        >
          <Strikethrough size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("highlight") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("subscript") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Subscript"
        >
          <SubscriptIcon size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("superscript") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Superscript"
        >
          <SuperscriptIcon size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("heading", { level: 1 }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("heading", { level: 2 }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("heading", { level: 3 }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive({ textAlign: "left" }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive({ textAlign: "center" }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive({ textAlign: "right" }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive({ textAlign: "justify" }) ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Justify"
        >
          <AlignJustify size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("bulletList") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("orderedList") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("taskList") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Task List"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("blockquote") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Blockquote"
        >
          <Quote size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("codeBlock") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          title="Clear Formatting"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={setLink}
          className={`tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${editor.isActive("link") ? "is-active bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
          title="Link"
        >
          <LinkIcon size={16} />
        </button>
        <button type="button"
          onClick={addImage}
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          title="Image"
        >
          <ImageIcon size={16} />
        </button>
        <button type="button"
          onClick={addVideo}
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          title="Video"
        >
          <VideoIcon size={16} />
        </button>
      </div>

      {/* Table Controls */}
      <div className="tiptap-toolbar-group flex items-center gap-1 pr-2 mr-1 border-r border-gray-200 dark:border-gray-700">
        <button type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
          title="Insert Table"
        >
          <TableIcon size={16} />
        </button>
        {editor.isActive("table") && (
          <>
            <button type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-blue-600 dark:text-blue-400"
              title="Add Column"
            >
              <Columns size={16} />
            </button>
            <button type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-blue-600 dark:text-blue-400"
              title="Add Row"
            >
              <Rows size={16} />
            </button>
            <button type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-red-500"
              title="Delete Table"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>

      <div className="tiptap-toolbar-group flex items-center gap-1">
        <button type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="tiptap-toolbar-button flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>
    </div>
  );
};

const RichTextEditor = forwardRef<any, RichTextEditorProps>((props, ref) => {
  const {
    initialHtml,
    onContentChange,
    placeholder = "Start typing your content here...",
    minHeight = "500px",
    showPreviewToggle = true,
    showSaveButton = true,
    showClearButton = true,
    onSave,
    autoSave = false,
    localStorageKey,
    direction = "ltr",
  } = props;

  const [showPreview, setShowPreview] = useState(false);

  const getInitialContent = useCallback(() => {
    if (localStorageKey) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        if (!saved.trim().startsWith("{")) {
          return normalizeLegacyHtml(saved);
        }
        try {
          const parsed = JSON.parse(saved);
          if (parsed.content || parsed.type === "doc") {
            return parsed;
          }
        } catch (e) {
          return normalizeLegacyHtml(saved);
        }
      }
    }
    return normalizeLegacyHtml(initialHtml || "");
  }, [localStorageKey, initialHtml]);

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "cursor-pointer text-blue-600 underline",
        },
      }),
      Image,
      VideoEmbed,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder,
      }),
      TextStyle,
      Color,
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      FontFamily,
      CharacterCount,
    ],
    content: getInitialContent(),
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none min-h-[var(--editor-min-height)] p-4",
        dir: direction,
      },
      // Clean up pasted HTML to prevent unwanted bolding from some sources (like MS Word/Google Docs)
      transformPastedHTML(html) {
        return (
          html
            .replace(/font-weight:\s*bold/g, "")
            .replace(/font-weight:\s*700/g, "")
            .replace(/font-weight:\s*800/g, "")
            .replace(/font-weight:\s*900/g, "")
            // Remove <strong> tags that wrap the entire content of a list item or paragraph when pasting from Google Docs
            .replace(/<li>\s*<strong>(.*?)<\/strong>\s*<\/li>/g, "<li>$1</li>")
            .replace(/<li>\s*<b>(.*?)<\/b>\s*<\/li>/g, "<li>$1</li>")
        );
      },
    },
    onUpdate: ({ editor }) => {
      const html = cleanHtml(editor.getHTML());
      if (onContentChange) {
        onContentChange(html);
      }
      if (autoSave && localStorageKey) {
        localStorage.setItem(localStorageKey, html);
      }
    },
  });

  useImperativeHandle(ref, () => ({
    getContent: () => ({
      json: JSON.stringify(editor?.getJSON()),
      html: cleanHtml(editor?.getHTML() || ""),
    }),
    setContent: (content: string) => {
      if (editor) {
        try {
          const json = JSON.parse(content);
          // Only TipTap documents; anything else (e.g. old Quill deltas) is treated as HTML
          editor.commands.setContent(json?.type === "doc" ? json : normalizeLegacyHtml(content));
        } catch (e) {
          editor.commands.setContent(normalizeLegacyHtml(content));
        }
      }
    },
    setHtmlContent: (html: string) => {
      editor?.commands.setContent(normalizeLegacyHtml(html || ""));
    },
  }));

  const handleSave = () => {
    if (!editor) return;
    const html = cleanHtml(editor.getHTML());
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, html);
    }
    if (onSave) {
      onSave(html);
    } else {
      alert("Content saved successfully!");
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all content?")) {
      editor?.commands.clearContent();
      if (localStorageKey) {
        localStorage.removeItem(localStorageKey);
      }
      if (onContentChange) {
        onContentChange("");
      }
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const { setLink } = useSharedActions(editor);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="animate-pulse">Loading Editor...</div>
      </div>
    );
  }

  return (
    <div
      className="rich-text-editor-wrapper w-full max-w-full"
      style={{ "--editor-min-height": minHeight } as React.CSSProperties}
    >
      {/* Header with action buttons */}
      {(showPreviewToggle || showClearButton || showSaveButton) && (
        <div
          className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          dir={direction}
        >
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Baseline className="w-5 h-5 text-brand-500" />
            {showPreview ? "Preview Mode" : "Rich Text Editor"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {showPreviewToggle && (
              <button type="button"
                onClick={togglePreview}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              >
                {showPreview ? "Edit Content" : "Preview"}
              </button>
            )}
            {showClearButton && (
              <button type="button"
                onClick={handleClear}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              >
                Clear
              </button>
            )}
            {showSaveButton && (
              <button type="button"
                onClick={handleSave}
                className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}

      {!showPreview ? (
        <div className="tiptap-editor-wrapper border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
          <MenuBar editor={editor} />
          <EditorContent
            editor={editor}
            className="tiptap-content prose max-w-none dark:prose-invert"
          />

          {/* Text Formatting Bubble Menu */}
          <BubbleMenu
            editor={editor}
            pluginKey="textBubbleMenu"
            shouldShow={shouldShowTextMenu}
          >
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-xl overflow-hidden dark:border-gray-800 dark:bg-gray-900">
              <button type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`rounded p-1.5 px-3 text-xs font-bold transition hover:bg-gray-100 dark:hover:bg-gray-800 ${editor.isActive("bold") ? "bg-brand-50 text-brand-500 dark:bg-brand-500/20" : "text-gray-600 dark:text-gray-400"}`}
              >
                B
              </button>
              <button type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`rounded p-1.5 px-3 text-xs font-bold italic transition hover:bg-gray-100 dark:hover:bg-gray-800 ${editor.isActive("italic") ? "bg-brand-50 text-brand-500 dark:bg-brand-500/20" : "text-gray-600 dark:text-gray-400"}`}
              >
                I
              </button>
              <div className="mx-1 h-3 w-px bg-gray-200 dark:bg-gray-700"></div>
              <button type="button"
                onClick={setLink}
                className={`rounded p-1.5 px-3 text-xs font-semibold transition hover:bg-gray-100 dark:hover:bg-gray-800 ${editor.isActive("link") ? "bg-brand-50 text-brand-500 dark:bg-brand-500/20" : "text-gray-600 dark:text-gray-400"}`}
              >
                Link
              </button>
            </div>
          </BubbleMenu>

          {/* Table Specific Bubble Menu */}
          <BubbleMenu
            editor={editor}
            pluginKey="tableBubbleMenu"
            shouldShow={shouldShowTableMenu}
          >
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-2xl overflow-hidden dark:border-gray-700 dark:bg-gray-800 scale-110">
                <button type="button"
                  onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                  className={`flex items-center gap-1.5 rounded p-2 text-xs font-bold transition-colors ${editor.isActive("tableHeader") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                  title="Toggle Header Row"
                >
                  <Type size={14} />
                  <span>Header</span>
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                <button type="button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="flex items-center gap-1.5 rounded p-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                  title="Add Column"
                >
                  <Columns size={14} />
                  <span>Col+</span>
                </button>
                <button type="button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="flex items-center gap-1.5 rounded p-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                  title="Add Row"
                >
                  <Rows size={14} />
                  <span>Row+</span>
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                <button type="button"
                  onClick={() => editor.chain().focus().mergeCells().run()}
                  className="rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Merge Cells"
                  disabled={!editor.can().mergeCells()}
                >
                  <TableCellsMerge size={16} />
                </button>
                <button type="button"
                  onClick={() => editor.chain().focus().splitCell().run()}
                  className="rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Split Cell"
                  disabled={!editor.can().splitCell()}
                >
                  <Split size={16} />
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                <button type="button"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  className="rounded p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete Row"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </BubbleMenu>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 min-h-[var(--editor-min-height)]">
          <div
            className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
            dir={direction}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
        <div className="flex items-center gap-3">
          <span>{editor.storage.characterCount.characters()} Characters</span>
          <span>{editor.storage.characterCount.words()} Words</span>
        </div>
        <div className="text-gray-300 dark:text-gray-600">
          Tip: Use the "Header" button in the table menu to set the first row as
          thead
        </div>
      </div>
    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
