# RichTextEditor Component

A fully reusable rich text editor component built with React Draft WYSIWYG.

## Features

- ✅ Full WYSIWYG editing capabilities
- ✅ Preview mode with working links
- ✅ Auto-save to localStorage
- ✅ Customizable toolbar
- ✅ Dark mode support
- ✅ Export to JSON and HTML
- ✅ Callback functions for content changes
- ✅ Configurable UI controls

## Installation

The component is already installed in your project at:
```
src/components/common/RichTextEditor.tsx
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialContent` | `string` | - | JSON string of initial editor content |
| `onContentChange` | `(content: string) => void` | - | Callback fired when content changes |
| `placeholder` | `string` | `"Start typing..."` | Placeholder text for empty editor |
| `minHeight` | `string` | `"500px"` | Minimum height of the editor |
| `showPreviewToggle` | `boolean` | `true` | Show/hide preview toggle button |
| `showSaveButton` | `boolean` | `true` | Show/hide save button |
| `showClearButton` | `boolean` | `true` | Show/hide clear button |
| `onSave` | `(content: string) => void` | - | Custom save handler |
| `autoSave` | `boolean` | `false` | Enable auto-save to localStorage |
| `localStorageKey` | `string` | - | Key for localStorage persistence |

## Usage Examples

### Example 1: Basic Usage
```tsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyPage() {
  return (
    <RichTextEditor
      placeholder="Write something amazing..."
      minHeight="400px"
    />
  );
}
```

### Example 2: With localStorage Auto-Save
```tsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyPage() {
  return (
    <RichTextEditor
      localStorageKey="myPageContent"
      autoSave={true}
      placeholder="Your content is auto-saved!"
    />
  );
}
```

### Example 3: With Custom Save Handler
```tsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyPage() {
  const handleSave = (content: string) => {
    // Send to API
    fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ content }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return (
    <RichTextEditor
      onSave={handleSave}
      placeholder="Save to server..."
    />
  );
}
```

### Example 4: With Content Change Tracking
```tsx
import RichTextEditor from '../components/common/RichTextEditor';
import { useState } from 'react';

function MyPage() {
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (content: string) => {
    setHasChanges(true);
  };

  return (
    <div>
      {hasChanges && <p>You have unsaved changes!</p>}
      <RichTextEditor
        onContentChange={handleContentChange}
      />
    </div>
  );
}
```

### Example 5: Minimal Editor (No Buttons)
```tsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyPage() {
  return (
    <RichTextEditor
      showPreviewToggle={false}
      showSaveButton={false}
      showClearButton={false}
      placeholder="Clean editor interface..."
      minHeight="300px"
    />
  );
}
```

### Example 6: With Initial Content
```tsx
import RichTextEditor from '../components/common/RichTextEditor';

function MyPage() {
  const initialContent = JSON.stringify({
    blocks: [
      {
        key: '1',
        text: 'Hello World!',
        type: 'unstyled',
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {}
      }
    ],
    entityMap: {}
  });

  return (
    <RichTextEditor
      initialContent={initialContent}
      placeholder="Edit this content..."
    />
  );
}
```

### Example 7: Using Ref to Get Content Programmatically
```tsx
import RichTextEditor from '../components/common/RichTextEditor';
import { useRef } from 'react';

function MyPage() {
  const editorRef = useRef<any>(null);

  const handleExport = () => {
    if (editorRef.current) {
      const { json, html } = editorRef.current.getContent();
      
      // Download as file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'content.html';
      a.click();
    }
  };

  return (
    <div>
      <button onClick={handleExport}>Export HTML</button>
      <RichTextEditor ref={editorRef} />
    </div>
  );
}
```

### Example 8: FAQ Editor
```tsx
import RichTextEditor from '../components/common/RichTextEditor';
import { useState } from 'react';

function FAQEditor() {
  const [faqs, setFaqs] = useState<Array<{question: string, answer: string}>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');

  const handleSaveFAQ = (answerContent: string) => {
    const newFAQ = {
      question: currentQuestion,
      answer: answerContent
    };
    setFaqs([...faqs, newFAQ]);
    setCurrentQuestion('');
  };

  return (
    <div>
      <input
        value={currentQuestion}
        onChange={(e) => setCurrentQuestion(e.target.value)}
        placeholder="Enter question..."
      />
      <RichTextEditor
        onSave={handleSaveFAQ}
        placeholder="Enter answer..."
        minHeight="300px"
      />
    </div>
  );
}
```

## Public Methods

You can access these methods using a ref:

- `getContent()`: Returns `{ json: string, html: string }`
- `setContent(jsonContent: string)`: Sets the editor content

## Styling

The component includes built-in dark mode support and responsive design. All styles are scoped within the component.

## Content Format

The editor stores content in Draft.js raw format (JSON). You can:
- Store it in a database
- Convert to HTML using the built-in converter
- Export/import between different editors

## Tips

1. **Use localStorage for drafts**: Set `localStorageKey` and `autoSave={true}` for automatic draft saving
2. **Custom save logic**: Use `onSave` prop to integrate with your backend
3. **Track changes**: Use `onContentChange` to detect when user modifies content
4. **Preview before save**: Enable `showPreviewToggle` to let users see formatted output
5. **Minimal UI**: Hide buttons for embedded editors using the show* props
