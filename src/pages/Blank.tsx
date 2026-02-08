import PageBreadcrumb from '../components/common/PageBreadCrumb';
import PageMeta from '../components/common/PageMeta';
import RichTextEditor from '../components/common/RichTextEditor';

export default function Blank() {
  const handleContentChange = () => {
  };

  const handleSave = () => {
    alert('Content saved successfully!');
  };

  return (
    <div>
      <PageMeta
        title="Text Editor | TailAdmin - React.js Admin Dashboard"
        description="Rich text editor page with React Draft WYSIWYG"
      />
      <PageBreadcrumb pageTitle="Text Editor" />

      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <RichTextEditor
          localStorageKey="editorContent"
          placeholder="Start typing your content here..."
          minHeight="500px"
          showPreviewToggle={true}
          showSaveButton={true}
          showClearButton={true}
          autoSave={false}
          onContentChange={handleContentChange}
          onSave={handleSave}
        />

        {/* Info Section */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your content is automatically saved to browser storage when you click the Save button.
                Use the toolbar above to format your text with various styling options including links, images, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
