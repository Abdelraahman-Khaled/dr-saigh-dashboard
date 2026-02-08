import { Component } from 'react';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import PageMeta from '../components/common/PageMeta';
import RichTextEditor from '../components/common/RichTextEditor';
import { toast } from 'react-toastify';
import { getAllFAQs, createFAQ, updateFAQ, deleteFAQ, type FAQ } from '../api/faq';

interface FAQState {
    faqs: FAQ[];
    currentQuestionEn: string;
    currentQuestionAr: string;
    editingId: string | number | null;
    isPublished: boolean;
    showEditor: boolean;
    viewLanguage: 'en' | 'ar';
    isSaving: boolean;

}

export default class FAQPage extends Component<{}, FAQState> {
    private editorRefEn: any;
    private editorRefAr: any;

    constructor(props: {}) {
        super(props);
        this.editorRefEn = null;
        this.editorRefAr = null;
        this.state = {
            faqs: [],
            currentQuestionEn: '',
            currentQuestionAr: '',
            editingId: null,
            isPublished: true,
            showEditor: false,
            viewLanguage: 'en',
            isSaving: false,

        };
    }

    componentDidMount() {
        this.loadFAQs();
    }

    loadFAQs = async () => {
        try {
            const faqs = await getAllFAQs();
            this.setState({ faqs });
        } catch (e) {
            console.error('Error loading FAQs:', e);
        }
    };

    handleQuestionChangeEn = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ currentQuestionEn: e.target.value });
    };

    handleQuestionChangeAr = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ currentQuestionAr: e.target.value });
    };

    handleSaveAnswer = async () => {
        const { currentQuestionEn, currentQuestionAr, editingId } = this.state;

        // Get content from En editor (using HTML version for backend)
        let htmlEn = '';
        if (this.editorRefEn) {
            htmlEn = this.editorRefEn.getContent().html;
        }

        // Get content from Ar editor
        let htmlAr = '';
        if (this.editorRefAr) {
            htmlAr = this.editorRefAr.getContent().html;
        }

        if (!currentQuestionEn.trim()) {
            toast.error('Please enter a question in English');
            return;
        }

        if (!htmlEn || htmlEn === '<p></p>') {
            toast.error('Please enter an answer in English');
            return;
        }

        this.setState({ isSaving: true });

        try {

            const faqData: Partial<FAQ> = {
                questionEn: currentQuestionEn,
                questionAr: currentQuestionAr,
                answerEn: htmlEn,
                answerAr: htmlAr,
                isPublished: this.state.isPublished
            };

            if (editingId) {
                await updateFAQ(editingId, faqData);
                toast.success('FAQ updated successfully!');
            } else {
                await createFAQ(faqData);
                toast.success('FAQ added successfully!');
            }

            this.setState({
                currentQuestionEn: '',
                currentQuestionAr: '',
                editingId: null,
                showEditor: false,
                isSaving: false,
            });

            this.loadFAQs();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            toast.error('Failed to save FAQ');
            this.setState({ isSaving: false });
        }

    };

    handleEditFAQ = (faq: FAQ) => {
        this.setState({
            currentQuestionEn: faq.questionEn,
            currentQuestionAr: faq.questionAr,
            editingId: faq.id,
            isPublished: faq.isPublished,
            showEditor: true,
        });

        // Set editor content (initializing with HTML from API)
        setTimeout(() => {
            if (this.editorRefEn) {
                this.editorRefEn.setHtmlContent(faq.answerEn);
            }
            if (this.editorRefAr) {
                this.editorRefAr.setHtmlContent(faq.answerAr);
            }
        }, 100);
    };

    handleDeleteFAQ = async (id: string | number) => {
        if (window.confirm('Are you sure you want to delete this FAQ?')) {
            try {
                await deleteFAQ(id);
                toast.success('FAQ deleted successfully');
                this.loadFAQs();
            } catch (error) {
                console.error('Error deleting FAQ:', error);
                toast.error('Failed to delete FAQ');
            }
        }
    };


    handleSwitchViewLanguage = (lang: 'en' | 'ar') => {
        this.setState({ viewLanguage: lang });
    };

    handleCancelEdit = () => {
        this.setState({
            currentQuestionEn: '',
            currentQuestionAr: '',
            editingId: null,
            showEditor: false,
        });
    };

    handleNewFAQ = () => {
        this.setState({
            currentQuestionEn: '',
            currentQuestionAr: '',
            editingId: null,
            isPublished: true,
            showEditor: true,
        });
    };


    handleToggleStatus = async (id: string | number, currentStatus: boolean) => {
        const faq = this.state.faqs.find(f => f.id === id);
        if (!faq) return;

        try {
            await updateFAQ(id, {
                questionEn: faq.questionEn,
                questionAr: faq.questionAr,
                answerEn: faq.answerEn,
                answerAr: faq.answerAr,
                isPublished: !currentStatus
            });
            toast.success(`FAQ ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            this.loadFAQs();
        } catch (error) {
            console.error('Error toggling FAQ status:', error);
            toast.error('Failed to update status');
        }
    };

    render() {
        const { faqs, currentQuestionEn, currentQuestionAr, editingId, showEditor, viewLanguage } = this.state;

        return (
            <div>
                <PageMeta
                    title="FAQ Management | TailAdmin - React.js Admin Dashboard"
                    description="Manage frequently asked questions with rich text editor"
                />
                <PageBreadcrumb pageTitle="FAQ Management" />

                <div className="space-y-6">
                    {/* Header with Add Button */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                Frequently Asked Questions
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Manage your FAQ content with rich text formatting
                            </p>
                        </div>
                        {!showEditor && (
                            <button
                                onClick={this.handleNewFAQ}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                Add New FAQ
                            </button>
                        )}
                    </div>

                    {/* FAQ Editor Card */}
                    {showEditor && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                    {editingId ? 'Edit FAQ' : 'Add New FAQ'}
                                </h3>
                                <button
                                    onClick={this.handleCancelEdit}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* English and Arabic Fields Side-by-Side */}
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                {/* English Side */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-300">ENGLISH</span>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Question (English) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentQuestionEn}
                                            onChange={this.handleQuestionChangeEn}
                                            placeholder="Enter your question here..."
                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Answer (English) <span className="text-red-500">*</span>
                                        </label>
                                        <RichTextEditor
                                            ref={(ref) => { this.editorRefEn = ref; }}
                                            placeholder="Enter the answer with rich formatting..."
                                            minHeight="300px"
                                            showPreviewToggle={true}
                                            showSaveButton={false}
                                            showClearButton={false}
                                            direction="ltr"
                                        />
                                    </div>
                                </div>

                                {/* Arabic Side */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">المحتوى العربي</span>
                                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800 dark:bg-green-900 dark:text-green-300">ARABIC</span>
                                    </div>
                                    <div dir="rtl">
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                                            السؤال (بالعربية)
                                        </label>
                                        <input
                                            type="text"
                                            value={currentQuestionAr}
                                            onChange={this.handleQuestionChangeAr}
                                            placeholder="أدخل السؤال هنا..."
                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-blue-500 text-right"
                                            dir="rtl"
                                        />
                                    </div>
                                    <div dir="rtl">
                                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                                            الإجابة (بالعربية)
                                        </label>
                                        <RichTextEditor
                                            ref={(ref) => { this.editorRefAr = ref; }}
                                            placeholder="أدخل الإجابة هنا..."
                                            minHeight="300px"
                                            showPreviewToggle={true}
                                            showSaveButton={false}
                                            showClearButton={false}
                                            direction="rtl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={this.handleSaveAnswer}
                                    disabled={this.state.isSaving}
                                    className={`rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${this.state.isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {this.state.isSaving ? (
                                        <div className="flex items-center gap-2">
                                            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </div>
                                    ) : (
                                        editingId ? 'Update FAQ' : 'Save FAQ'
                                    )}
                                </button>

                                <button
                                    onClick={() => this.setState({ isPublished: !this.state.isPublished })}
                                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${this.state.isPublished
                                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400'
                                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400'
                                        }`}
                                >
                                    <div className={`h-4 w-4 rounded-full border-2 ${this.state.isPublished ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'}`} />
                                    {this.state.isPublished ? 'Published' : 'Draft'}
                                </button>
                                <button
                                    onClick={this.handleCancelEdit}
                                    className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FAQ List */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                All FAQs ({faqs.length})
                            </h3>
                            {/* List Language Toggle */}
                            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                                <button
                                    onClick={() => this.handleSwitchViewLanguage('en')}
                                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewLanguage === 'en'
                                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => this.handleSwitchViewLanguage('ar')}
                                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewLanguage === 'ar'
                                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Arabic
                                </button>
                            </div>
                        </div>

                        {faqs.length === 0 ? (
                            <div className="py-12 text-center">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                                    No FAQs yet
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Get started by creating your first FAQ
                                </p>
                                <button
                                    onClick={this.handleNewFAQ}
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    Add Your First FAQ
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {faqs.map((faq, index) => {
                                    const question = viewLanguage === 'en' ? faq.questionEn : (faq.questionAr || 'No Arabic translation');
                                    const answerHtml = viewLanguage === 'en' ? faq.answerEn : (faq.answerAr || '<p>No Arabic translation available</p>');
                                    const isRtl = viewLanguage === 'ar';

                                    return (
                                        <div
                                            key={faq.id}
                                            className={`rounded-lg border transition hover:border-gray-300 dark:hover:border-gray-600 ${faq.isPublished
                                                ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'
                                                : 'border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10'
                                                }`}
                                            dir={isRtl ? 'rtl' : 'ltr'}
                                        >
                                            <div className="p-5">
                                                <div className="mb-3 flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {index + 1}
                                                            </span>
                                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                                                                {question}
                                                            </h4>
                                                            <button
                                                                onClick={() => this.handleToggleStatus(faq.id, faq.isPublished)}
                                                                className={`mx-2 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${faq.isPublished
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400'
                                                                    }`}
                                                            >
                                                                {faq.isPublished ? 'Active' : 'Inactive'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex gap-2">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => this.handleEditFAQ(faq)}
                                                                className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700"
                                                                title="Edit FAQ"
                                                            >
                                                                <svg
                                                                    className="h-4 w-4"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => this.handleDeleteFAQ(faq.id)}
                                                                className="h-8 rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700"
                                                                title="Delete FAQ"
                                                            >
                                                                <svg
                                                                    className="h-4 w-4"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`prose prose-sm dark:text-white max-w-none transition-opacity dark:prose-invert prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300 ${faq.isPublished ? 'opacity-100' : 'opacity-60'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: answerHtml }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
