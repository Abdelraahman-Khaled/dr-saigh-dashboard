
import { Component, createRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './RichTextEditor.css';

interface RichTextEditorProps {
    initialContent?: string; // Legacy DraftJS JSON (unused in new implementation but kept for prop interface compatibility)
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
    direction?: 'ltr' | 'rtl';
}

interface RichTextEditorState {
    editorHtml: string;
    showPreview: boolean;
}

export default class RichTextEditor extends Component<RichTextEditorProps, RichTextEditorState> {
    static defaultProps = {
        placeholder: 'Start typing your content here...',
        minHeight: '500px',
        showPreviewToggle: true,
        showSaveButton: true,
        showClearButton: true,
        autoSave: false,
        direction: 'ltr',
    };

    reactQuillRef = createRef<ReactQuill>();

    constructor(props: RichTextEditorProps) {
        super(props);

        let initialHtml = props.initialHtml || '';

        // Try to load from localStorage
        if (props.localStorageKey) {
            const saved = localStorage.getItem(props.localStorageKey);
            if (saved) {
                // Determine if legacy DraftJS JSON
                // DraftJS JSON is an object with "blocks" array.
                if (!saved.trim().startsWith('{')) {
                    initialHtml = saved;
                } else {
                    try {
                        const parsed = JSON.parse(saved);
                        if (!parsed.blocks) {
                            // If it's JSON but not DraftJS (maybe Quill Delta?), we might use it differently.
                            // But for now, assume safe HTML string if not DraftJS structure.
                            // If it IS DraftJS, we ignore it to avoid crashing Quill with invalid HTML.
                        }
                    } catch (e) {
                        // Not valid JSON, so probably HTML string
                        initialHtml = saved;
                    }
                }
            }
        }

        this.state = {
            editorHtml: initialHtml,
            showPreview: false,
        };
    }

    cleanHtml = (html: string): string => {
        if (!html) return html;
        // Replace all non-breaking spaces with regular spaces
        return html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
    };

    handleChange = (html: string, _delta: any, _source: any, editor: any) => {
        // Don't clean here - it causes cursor to jump
        this.setState({ editorHtml: html }, () => {
            if (this.props.onContentChange) {
                this.props.onContentChange(JSON.stringify(editor.getContents()));
            }

            if (this.props.autoSave && this.props.localStorageKey) {
                // Clean before saving to localStorage
                localStorage.setItem(this.props.localStorageKey, this.cleanHtml(html));
            }
        });
    };

    handleSave = () => {
        const cleanedHtml = this.cleanHtml(this.state.editorHtml);
        
        if (this.props.localStorageKey) {
            localStorage.setItem(this.props.localStorageKey, cleanedHtml);
        }

        if (this.props.onSave) {
            this.props.onSave(cleanedHtml);
        } else {
            alert('Content saved successfully!');
        }
    };

    handleClear = () => {
        if (window.confirm('Are you sure you want to clear all content?')) {
            this.setState({ editorHtml: '' }, () => {
                if (this.props.localStorageKey) {
                    localStorage.removeItem(this.props.localStorageKey);
                }
                if (this.props.onContentChange) {
                    this.props.onContentChange('');
                }
            });
        }
    };

    togglePreview = () => {
        this.setState({ showPreview: !this.state.showPreview });
    };

    // Public method to get content
    getContent = (): { json: string; html: string } => {
        const quill = this.reactQuillRef.current?.getEditor();
        return {
            json: quill ? JSON.stringify(quill.getContents()) : '{}',
            html: this.cleanHtml(this.state.editorHtml), // Clean before returning
        };
    };

    // Public method to set content from JSON (Quill Delta)
    setContent = (jsonContent: string) => {
        if (!jsonContent) {
             this.setState({ editorHtml: '' });
             return;
        }
        try {
            const delta = JSON.parse(jsonContent);
            const quill = this.reactQuillRef.current?.getEditor();
            if (quill) {
                quill.setContents(delta);
                // Quill's onChange should trigger? 
                // Wait, setContents is API call, usually triggers text-change with source 'api'.
                // But we need to sync state.editorHtml.
                // ReactQuill's onChange might trigger.
                // But just in case, we can manually grab HTML after a tick.
                setTimeout(() => {
                    this.setState({ editorHtml: quill.root.innerHTML });
                }, 0);
            }
        } catch (e) {
            console.error('Error setting content:', e);
        }
    };

    // Public method to set content from HTML
    setHtmlContent = (htmlContent: string) => {
         this.setState({ editorHtml: htmlContent || '' });
    };

    render() {
        const { editorHtml, showPreview } = this.state;
        const {
            placeholder,
            minHeight,
            showPreviewToggle,
            showSaveButton,
            showClearButton,
            direction,
        } = this.props;

        const modules = {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                // Removed color and background to prevent styled spans on paste
                ['clean']
            ],
            clipboard: {
                matchVisual: false,
            }
        };

        const formats = [
            'header',
            'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
            'list', 'bullet', 'indent',
            'direction', 'align',
            'link', 'image', 'video',
            // Removed 'color' and 'background' to prevent styled spans
        ];

        return (
            <div
                className="rich-text-editor-wrapper"
                style={{ '--editor-min-height': minHeight } as React.CSSProperties}
            >
                {/* Header with action buttons */}
                {(showPreviewToggle || showClearButton || showSaveButton) && (
                    <div className="mb-4 flex items-center justify-between" dir={direction}>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            {showPreview ? 'Preview Mode' : 'Editor Mode'}
                        </h3>
                        <div className="flex gap-3">
                            {showPreviewToggle && (
                                <button
                                    onClick={this.togglePreview}
                                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                                >
                                    {showPreview ? 'Edit' : 'Preview'}
                                </button>
                            )}
                            {showClearButton && (
                                <button
                                    onClick={this.handleClear}
                                    className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                    Clear
                                </button>
                            )}
                            {showSaveButton && (
                                <button
                                    onClick={this.handleSave}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Editor or Preview */}
                {!showPreview ? (
                    <div className={`quill-wrapper ${direction === 'rtl' ? 'rtl-editor' : ''}`} dir={direction}>
                         <ReactQuill
                            ref={this.reactQuillRef}
                            theme="snow"
                            value={editorHtml}
                            onChange={this.handleChange}
                            modules={modules}
                            formats={formats}
                            placeholder={placeholder}
                            style={{ minHeight: minHeight }}
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                        <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                            Preview (Links are clickable)
                        </h4>
                        <div
                            className="prose prose-sm max-w-none dark:prose-invert prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300"
                            dangerouslySetInnerHTML={{ __html: editorHtml }}
                            dir={direction}
                        />
                    </div>
                )}
            </div>
        );
    }
}
