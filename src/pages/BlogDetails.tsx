
import { Component, ChangeEvent } from 'react';
import { useParams, Link } from 'react-router';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import PageMeta from '../components/common/PageMeta';
import RichTextEditor from '../components/common/RichTextEditor';
import { toast } from 'react-toastify';
import { getBlogById, getBlogContents, saveBlogContents, deleteBlogContent, createBlogFAQ, updateBlogFAQ, deleteBlogFAQ, getBlogFAQs, updateBlogContent, type Blog, type BlogBlock, type BlogFAQ, type BlogImage } from '../api/blog';

interface BlogDetailsState {
    blog: Blog | null;
    loading: boolean;
    isSaving: boolean;
    viewLanguage: 'en' | 'ar';
    isPreview: boolean;
    hasUnsavedChanges: boolean;
}

// Wrapper to use useParams with Class Component
function withParams(Component: any) {
    return (props: any) => <Component {...props} params={useParams()} />;
}

class BlogDetails extends Component<{ params: { id: string } }, BlogDetailsState> {
    private editorRefs: { [key: string]: any };

    constructor(props: { params: { id: string } }) {
        super(props);
        this.editorRefs = {};
        this.state = {
            blog: null,
            loading: true,
            isSaving: false,
            viewLanguage: 'en',
            isPreview: false,
            hasUnsavedChanges: false,
        };
    }

    componentDidMount() {
        this.loadBlog();
    }

    loadBlog = async () => {
        const { id } = this.props.params;
        try {
            const blogMeta = await getBlogById(id);
            const contents = await getBlogContents(id);
            const faqs = await getBlogFAQs(id);

            const mergedBlog: Blog = {
                ...blogMeta,
                blocks: contents.blocks || [],
                faqs: faqs || [],
                gallery: contents.gallery || []
            };

            this.setState({ blog: mergedBlog, loading: false });
        } catch (error: any) {
            console.error('Error loading blog details:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load blog details.';
            toast.error(errorMessage);
            this.setState({ loading: false });
        }
    };

    handleSwitchViewLanguage = (lang: 'en' | 'ar') => {
        this.setState({ viewLanguage: lang });
    };

    handleTogglePreview = () => {
        const { blog, isPreview } = this.state;
        if (!blog) return;

        if (!isPreview) {
            // Going into preview mode: Gather latest content from editors
            const updatedBlocks = blog.blocks.map(block => {
                const editorEn = this.editorRefs[`${block.id}-en`];
                const editorAr = this.editorRefs[`${block.id}-ar`];

                let newBlock = { ...block };

                if (editorEn) {
                    const { html, json } = editorEn.getContent();
                    newBlock.contentEn = json;
                    newBlock.contentHtmlEn = html;
                }

                if (editorAr) {
                    const { html, json } = editorAr.getContent();
                    newBlock.contentAr = json;
                    newBlock.contentHtmlAr = html;
                }
                return newBlock;
            });

            const updatedFAQs = (blog.faqs || []).map(faq => {
                const faqEditorEn = this.editorRefs[`faq-${faq.id}-en`];
                const faqEditorAr = this.editorRefs[`faq-${faq.id}-ar`];

                let newFaq = { ...faq };

                if (faqEditorEn) {
                    const { html, json } = faqEditorEn.getContent();
                    newFaq.answerEn = json;
                    newFaq.answerHtmlEn = html;
                }

                if (faqEditorAr) {
                    const { html, json } = faqEditorAr.getContent();
                    newFaq.answerAr = json;
                    newFaq.answerHtmlAr = html;
                }
                return newFaq;
            });

            this.setState({
                blog: { ...blog, blocks: updatedBlocks, faqs: updatedFAQs },
                isPreview: true
            });
        } else {
            // Exiting preview mode
            this.setState({ isPreview: false });
        }
    };

    handleAddBlock = () => {
        const { blog } = this.state;
        if (!blog) return;

        const newBlock: BlogBlock = {
            id: `temp-${Date.now()}`,
            contentEn: '',
            contentHtmlEn: '',
            contentAr: '',
            contentHtmlAr: ''
        };

        this.setState({
            blog: {
                ...blog,
                blocks: [...blog.blocks, newBlock]
            },
            hasUnsavedChanges: true
        });
    };

    handleRemoveBlock = async (blockId: string) => {
        const { blog } = this.state;
        if (!blog) return;

        if (window.confirm('Are you sure you want to remove this section?')) {
            try {
                const isRealId = !blockId.toString().startsWith('temp-');

                if (isRealId) {
                    await deleteBlogContent(blog.id, blockId);
                    toast.success('Section deleted Successfully');
                }

                this.setState({
                    blog: {
                        ...blog,
                        blocks: blog.blocks.filter(b => b.id !== blockId)
                    },
                    hasUnsavedChanges: true // Any structural change is an unsaved change
                });
                delete this.editorRefs[`${blockId}-en`];
                delete this.editorRefs[`${blockId}-ar`];
            } catch (error: any) {
                console.error('Error deleting section:', error);
                toast.error(error.response?.data?.message || 'Failed to delete section from server');
            }
        }
    };


    // FAQ Handlers
    // FAQ Handlers
    handleAddFAQ = () => {
        const { blog } = this.state;
        if (!blog) return;

        const newFAQ: BlogFAQ = {
            id: `temp-${Date.now()}`,
            questionEn: '',
            answerEn: '',
            answerHtmlEn: '',
            questionAr: '',
            answerAr: '',
            answerHtmlAr: ''
        };

        this.setState({
            blog: { ...blog, faqs: [...(blog.faqs || []), newFAQ] },
            hasUnsavedChanges: true
        });
    };

    handleRemoveFAQ = async (faqId: string) => {
        const { blog } = this.state;
        if (!blog) return;

        if (window.confirm('Are you sure you want to remove this FAQ?')) {
            try {
                const isRealId = !faqId.toString().startsWith('temp-');

                if (isRealId) {
                    await deleteBlogFAQ(blog.id, faqId);
                    toast.success('FAQ deleted successfully');
                }

                const faqs = (blog.faqs || []).filter(f => f.id !== faqId);
                this.setState({
                    blog: { ...blog, faqs },
                    hasUnsavedChanges: true
                });

                // Clean up refs
                delete this.editorRefs[`faq-${faqId}-en`];
                delete this.editorRefs[`faq-${faqId}-ar`];
            } catch (error: any) {
                console.error('Error deleting FAQ:', error);
                toast.error(error.response?.data?.message || 'Failed to delete FAQ');
            }
        }
    };

    handleSaveFAQ = async (faqId: string) => {
        const { blog } = this.state;
        if (!blog) return;

        const faq = (blog.faqs || []).find(f => f.id === faqId);
        if (!faq) return;

        this.setState({ isSaving: true });

        const faqEditorEn = this.editorRefs[`faq-${faq.id}-en`];
        const faqEditorAr = this.editorRefs[`faq-${faq.id}-ar`];

        const answerHtmlEn = faqEditorEn ? faqEditorEn.getContent().html : (faq.answerHtmlEn || '');
        const answerHtmlAr = faqEditorAr ? faqEditorAr.getContent().html : (faq.answerHtmlAr || '');

        const formData = new FormData();
        formData.append('faq[question_en]', faq.questionEn);
        formData.append('faq[question_ar]', faq.questionAr);
        formData.append('faq[answer_en]', answerHtmlEn);
        formData.append('faq[answer_ar]', answerHtmlAr);
        formData.append('faq[is_published]', '1');

        try {
            const isRealId = !faqId.toString().startsWith('temp-');

            if (isRealId) {
                await updateBlogFAQ(blog.id, faqId, formData);
                toast.success('FAQ updated successfully');
            } else {
                await createBlogFAQ(blog.id, formData);
                toast.success('FAQ created successfully');
            }

            this.setState({ isSaving: false, hasUnsavedChanges: false });
            this.loadBlog();
        } catch (error: any) {
            console.error('Error saving FAQ:', error);
            toast.error(error.response?.data?.message || 'Failed to save FAQ');
            this.setState({ isSaving: false });
        }
    };

    handleFAQQuestionChange = (faqId: string, lang: 'en' | 'ar', value: string) => {
        const { blog } = this.state;
        if (!blog) return;

        const faqs = (blog.faqs || []).map(f => {
            if (f.id === faqId) {
                if (lang === 'en') return { ...f, questionEn: value };
                else return { ...f, questionAr: value };
            }
            return f;
        });

        this.setState({ blog: { ...blog, faqs } });
    };

    // Gallery Handlers
    handleUploadImages = async (e: ChangeEvent<HTMLInputElement>, blockId: string | null = null) => {
        const { blog } = this.state;
        if (!blog || !e.target.files) return;

        const files = Array.from(e.target.files);
        const newImages: BlogImage[] = [];

        for (const file of files) {
            try {
                const base64 = await this.fileToBase64(file);
                newImages.push({
                    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    url: base64,
                    name: file.name,
                    altEn: '',
                    altAr: '',
                    relatedBlockId: blockId,
                    file: file // Store the original file for later upload
                });
            } catch (error) {
                console.error("Error converting file to base64:", error);
            }
        }

        this.setState({
            blog: {
                ...blog,
                gallery: [...(blog.gallery || []), ...newImages]
            },
            hasUnsavedChanges: true
        });

        // Reset input
        e.target.value = '';
    };

    fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    handleRemoveImage = (imageId: string) => {
        const { blog } = this.state;
        if (!blog) return;

        if (window.confirm('Are you sure you want to remove this image?')) {
            const gallery = (blog.gallery || []).filter(img => img.id !== imageId);
            this.setState({ blog: { ...blog, gallery } });
        }
    };

    handleImageChange = (imageId: string, field: 'altEn' | 'altAr' | 'relatedBlockId', value: string | null) => {
        const { blog } = this.state;
        if (!blog) return;

        const gallery = (blog.gallery || []).map(img => {
            if (img.id === imageId) {
                return { ...img, [field]: value };
            }
            return img;
        });

        this.setState({ blog: { ...blog, gallery } });
    };

    handleSaveSection = async (blockId: string) => {
        const { blog } = this.state;
        if (!blog) return;

        this.setState({ isSaving: true });

        const block = blog.blocks.find(b => b.id === blockId);
        if (!block) {
            this.setState({ isSaving: false });
            return;
        }

        const editorEn = this.editorRefs[`${blockId}-en`];
        const editorAr = this.editorRefs[`${blockId}-ar`];

        const htmlEn = editorEn ? editorEn.getContent().html : (block.contentHtmlEn || '');
        const htmlAr = editorAr ? editorAr.getContent().html : (block.contentHtmlAr || '');

        const formData = new FormData();
        formData.append('content[content_en]', htmlEn);
        formData.append('content[content_ar]', htmlAr);
        formData.append('content[is_published]',"1");

        // Append images for THIS section
        // We send EVERYTHING so the backend knows about new uploads AND alt changes for existing ones
        const sectionImages = (blog.gallery || []).filter(img => img.relatedBlockId === blockId);
        sectionImages.forEach((img, index) => {
            const isExisting = !img.id.toString().startsWith('temp-');

            if (isExisting) {
                // For existing images, we send the ID to update alts
                formData.append(`content[content_photos_attributes][${index}][id]`, img.id);
            }

            if (img.file) {
                // If it's a newly selected file
                formData.append(`content[content_photos_attributes][${index}][photo]`, img.file);
            }

            formData.append(`content[content_photos_attributes][${index}][alt_en]`, img.altEn || '');
            formData.append(`content[content_photos_attributes][${index}][alt_ar]`, img.altAr || '');
        });

        const isRealId = !blockId.toString().startsWith('temp-');

        try {
            if (isRealId) {
                await updateBlogContent(blog.id, blockId, formData);
                toast.success('Section updated successfully!');
            } else {
                await saveBlogContents(blog.id, formData);
                toast.success('New section created successfully!');
            }

            this.setState({ isSaving: false, hasUnsavedChanges: false });
            this.loadBlog(); // Reload to get fresh data and IDs
        } catch (error: any) {
            console.error('Error saving section:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save section.';
            toast.error(errorMessage);
            this.setState({ isSaving: false });
        }
    };

    handleSaveContent = async () => {
        const { blog } = this.state;
        if (!blog) return;

        this.setState({ isSaving: true });

        // Collect and merge HTML from all blocks
        let mergedEnHtml = '';
        let mergedArHtml = '';

        blog.blocks.forEach((block) => {
            const editorEn = this.editorRefs[`${block.id}-en`];
            const editorAr = this.editorRefs[`${block.id}-ar`];

            const htmlEn = editorEn ? editorEn.getContent().html : (block.contentHtmlEn || '');
            const htmlAr = editorAr ? editorAr.getContent().html : (block.contentHtmlAr || '');

            mergedEnHtml += htmlEn;
            mergedArHtml += htmlAr;
        });

        // Construct FormData as per latest user requirement
        const formData = new FormData();

        formData.append('content[content_en]', mergedEnHtml);
        formData.append('content[content_ar]', mergedArHtml);
        formData.append('content[is_published]', "1");

        // Append all images (Merged)
        // We send EVERYTHING so the backend knows about new uploads AND alt changes for existing ones
        const allImages = (blog.gallery || []);
        allImages.forEach((img, index) => {
            const isExisting = !img.id.toString().startsWith('temp-');

            if (isExisting) {
                // For existing images, we send the ID to update alts
                formData.append(`content[content_photos_attributes][${index}][id]`, img.id);
            }

            if (img.file) {
                // If it's a newly selected file
                formData.append(`content[content_photos_attributes][${index}][photo]`, img.file);
            }

            formData.append(`content[content_photos_attributes][${index}][alt_en]`, img.altEn || '');
            formData.append(`content[content_photos_attributes][${index}][alt_ar]`, img.altAr || '');
        });


        try {
            await saveBlogContents(blog.id, formData);

            toast.success('Blog contents saved successfully!');
            this.setState({ isSaving: false, hasUnsavedChanges: false });
            this.loadBlog(); // Reload to get fresh data
        } catch (error: any) {
            console.error('Error saving content:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save content.';
            toast.error(errorMessage);
            this.setState({ isSaving: false });
        }
    };

    renderPreview() {
        const { blog, viewLanguage } = this.state;
        if (!blog) return null;

        const isRtl = viewLanguage === 'ar';
        const title = isRtl ? (blog.titleAr || 'Untitled') : blog.titleEn;
        const imageAlt = isRtl ? (blog.imageAltAr || '') : blog.imageAltEn;
        const dir = isRtl ? 'rtl' : 'ltr';

        return (
            <div className="mx-auto max-w-4xl" dir={dir}>
                {/* Preview Header / Language Toggle for Preview */}
                <div className="mb-6 flex justify-end">
                    <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                        <button
                            onClick={() => this.handleSwitchViewLanguage('en')}
                            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewLanguage === 'en'
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            English Preview
                        </button>
                        <button
                            onClick={() => this.handleSwitchViewLanguage('ar')}
                            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewLanguage === 'ar'
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            Arabic Preview
                        </button>
                    </div>
                </div>

                {/* Hero Image */}
                {blog.image && (
                    <div className="mb-8 overflow-hidden rounded-2xl bg-gray-100">
                        <img
                            src={blog.image}
                            alt={imageAlt}
                            className="h-auto w-full object-cover"
                        />
                    </div>
                )}

                {/* Meta / Category */}
                <div className="mb-4 flex items-center gap-4">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {blog.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(blog.createdAt).toLocaleDateString()}
                    </span>
                </div>

                {/* Title */}
                <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                    {title}
                </h1>

                {/* Content Blocks */}
                <div className="space-y-8">
                    {blog.blocks.map(block => {
                        const htmlContent = isRtl ? block.contentHtmlAr : block.contentHtmlEn;
                        if (!htmlContent) return null;

                        const relatedImages = (blog.gallery || []).filter(img => img.relatedBlockId === block.id);

                        return (
                            <div key={block.id}>
                                <div
                                    className="prose max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                                />
                                {relatedImages.length > 0 && (
                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {relatedImages.map(img => (
                                            <div key={img.id} className="overflow-hidden rounded-lg bg-gray-100">
                                                <img
                                                    src={img.url}
                                                    alt={isRtl ? img.altAr : img.altEn}
                                                    className="h-full w-full object-cover transition-transform hover:scale-105"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* FAQs */}
                {(blog.faqs && blog.faqs.length > 0) && (
                    <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
                        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                            {isRtl ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
                        </h2>
                        <div className="space-y-4">
                            {blog.faqs.map(faq => {
                                const question = isRtl ? faq.questionAr : faq.questionEn;
                                const answerHtml = isRtl ? faq.answerHtmlAr : faq.answerHtmlEn;

                                if (!question && !answerHtml) return null;

                                return (
                                    <div key={faq.id} className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-800/50">
                                        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                                            {question}
                                        </h3>
                                        <div
                                            className="prose max-w-none text-gray-600 dark:prose-invert dark:text-gray-300"
                                            dangerouslySetInnerHTML={{ __html: answerHtml }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    render() {
        const { blog, loading, isSaving, viewLanguage, isPreview, hasUnsavedChanges } = this.state;

        if (loading) {
            return <div className="p-6 text-center">Loading...</div>;
        }

        if (!blog) {
            return (
                <div className="p-6 text-center">
                    <h2 className="text-xl font-bold">Blog not found</h2>
                    <Link to="/blogs" className="mt-4 inline-block text-blue-600 hover:underline">
                        Back to Blogs
                    </Link>
                </div>
            );
        }

        const activeTitle = viewLanguage === 'en' ? blog.titleEn : (blog.titleAr || 'Untitled (Arabic)');
        const activeImageAlt = viewLanguage === 'en' ? blog.imageAltEn : (blog.imageAltAr || '');

        const isRtl = viewLanguage === 'ar';

        return (
            <div>
                <PageMeta
                    title={`Edit: ${activeTitle} | TailAdmin`}
                    description={activeImageAlt}
                />
                <PageBreadcrumb pageTitle={isPreview ? "Preview Blog" : "Edit Blog Content"} />

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-default dark:border-gray-800 dark:bg-gray-900" dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/blogs"
                                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                            >
                                {isRtl ? (
                                    <svg className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                )}
                                Back to Blogs
                            </Link>

                            <button
                                onClick={this.handleTogglePreview}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isPreview
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                                    }`}
                            >
                                {isPreview ? (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Mode
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview
                                    </>
                                )}
                            </button>
                        </div>

                        {!isPreview && (
                            <div className="flex items-center gap-4">
                                {blog.link && (
                                    <a
                                        href={blog.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:inline-flex dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Visit Website
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                )}
                                <button
                                    onClick={this.handleSaveContent}
                                    disabled={isSaving}
                                    className={`hidden items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 ${isSaving ? 'cursor-not-allowed opacity-70' : ''}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Save All Content (Merged)
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                            </div>
                        )}
                    </div>

                    {isPreview ? (
                        this.renderPreview()
                    ) : (
                        <>
                            <div className="mb-6 flex items-start gap-6">
                                {blog.image && (
                                    <div className="h-32 w-48 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                        <img
                                            src={blog.image}
                                            alt={activeImageAlt}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="mb-2">
                                        <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                            {blog.category}
                                        </span>
                                    </div>
                                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                                        {activeTitle}
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Created on {new Date(blog.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 space-y-8">
                                {blog.blocks.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        <p>No content sections added yet.</p>
                                        <p className="text-sm">Click "Add New Text Section" to start writing.</p>
                                    </div>
                                )}

                                {blog.blocks.map((block, index) => {
                                    const sectionImages = (blog.gallery || []).filter(img => img.relatedBlockId === block.id);

                                    return (
                                        <div key={block.id} className="relative rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                            <div className="mb-4 flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Section {index + 1}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => this.handleSaveSection(block.id)}
                                                        disabled={isSaving}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            (!block.id.toString().startsWith('temp-') ? 'Update Section' : 'Save Section')
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => this.handleRemoveBlock(block.id)}
                                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                        title="Remove Section"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                                {/* English Editor */}
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        English Content / المحتوى الإنجليزي
                                                    </label>
                                                    <RichTextEditor
                                                        ref={(ref) => { this.editorRefs[`${block.id}-en`] = ref; }}
                                                        initialHtml={block.contentHtmlEn}
                                                        direction="ltr"
                                                        placeholder="Write English section content..."
                                                        minHeight="300px"
                                                    />
                                                </div>

                                                {/* Arabic Editor */}
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Arabic Content / المحتوى العربي
                                                    </label>
                                                    <RichTextEditor
                                                        ref={(ref) => { this.editorRefs[`${block.id}-ar`] = ref; }}
                                                        initialHtml={block.contentHtmlAr}
                                                        direction="rtl"
                                                        placeholder="اكتب محتوى القسم بالعربية..."
                                                        minHeight="300px"
                                                    />
                                                </div>
                                            </div>

                                            {/* Section Media */}
                                            <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h4 className="font-semibold text-gray-800 dark:text-white">
                                                        Section Media / صور القسم
                                                    </h4>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            onChange={(e) => this.handleUploadImages(e, block.id)}
                                                            className="absolute inset-0 cursor-pointer opacity-0"
                                                            title="Upload Images"
                                                        />
                                                        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700">
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Images
                                                        </button>
                                                    </div>
                                                </div>

                                                {sectionImages.length === 0 ? (
                                                    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
                                                        <p className="text-sm">No images for this section yet.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        {sectionImages.map(img => (
                                                            <div key={img.id} className="group relative rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                                                <button
                                                                    onClick={() => this.handleRemoveImage(img.id)}
                                                                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                                                                    title="Remove Image"
                                                                >
                                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                                <div className="mb-4 h-48 overflow-hidden rounded-lg bg-gray-200">
                                                                    <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <input
                                                                        type="text"
                                                                        value={img.altEn}
                                                                        onChange={(e) => this.handleImageChange(img.id, 'altEn', e.target.value)}
                                                                        placeholder="Alt Text (EN)"
                                                                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={img.altAr}
                                                                        onChange={(e) => this.handleImageChange(img.id, 'altAr', e.target.value)}
                                                                        placeholder="وصف (عربي)"
                                                                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white text-right"
                                                                        dir="rtl"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasUnsavedChanges ? (
                                    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/30 py-6 text-orange-600 dark:border-orange-900/30 dark:bg-orange-900/10 dark:text-orange-400">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="font-medium">Please save your content before adding another section</p>
                                        <p className="text-xs opacity-80">Click the "Save Content" button at the top to proceed</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={this.handleAddBlock}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-gray-500 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        {isRtl ? "إضافة قسم جديد" : "Add New Text Section"}
                                    </button>
                                )}
                            </div>

                            {/* Global Gallery Section */}
                            {/* <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                        Global Media / صور عامة
                                    </h2>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => this.handleUploadImages(e)}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                            title="Upload Images"
                                        />
                                        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Upload Images
                                        </button>
                                    </div>
                                </div>

                                {((blog.gallery || []).filter(img => !img.relatedBlockId).length === 0) ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        <p>No global images uploaded yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                        {(blog.gallery || []).filter(img => !img.relatedBlockId).map((img) => (
                                            <div key={img.id} className="group relative rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                                <button
                                                    onClick={() => this.handleRemoveImage(img.id)}
                                                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
                                                    title="Remove Image"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                <div className="mb-4 h-48 overflow-hidden rounded-lg bg-gray-200">
                                                    <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                                            Assign to Section
                                                        </label>
                                                        <select
                                                            value={img.relatedBlockId || ''}
                                                            onChange={(e) => this.handleImageChange(img.id, 'relatedBlockId', e.target.value || null)}
                                                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                        >
                                                            <option value="">-- Unassigned --</option>
                                                            {blog.blocks.map((block, idx) => (
                                                                <option key={block.id} value={block.id}>
                                                                    Section {idx + 1}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div> */}


                            <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {isRtl ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
                                    </h2>
                                    <button
                                        onClick={this.handleAddFAQ}
                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        {isRtl ? "إضافة سؤال" : "Add FAQ"}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {(blog.faqs || []).length === 0 && (
                                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                            No FAQs added yet.
                                        </p>
                                    )}

                                    {(blog.faqs || []).map((faq, index) => (
                                        <div key={faq.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                            <div className="mb-4 flex justify-between">
                                                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                                    FAQ Pair {index + 1}
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => this.handleSaveFAQ(faq.id)}
                                                        disabled={isSaving}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            (!faq.id.toString().startsWith('temp-') ? 'Update FAQ' : 'Create FAQ')
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => this.handleRemoveFAQ(faq.id)}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-2 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                                                        title="Remove FAQ"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                {/* English Column */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-300">ENGLISH</span>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={faq.questionEn}
                                                            onChange={(e) => this.handleFAQQuestionChange(faq.id, 'en', e.target.value)}
                                                            placeholder="Question (English)"
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                    <div>
                                                        <RichTextEditor
                                                            ref={(ref) => {
                                                                if (ref) this.editorRefs[`faq-${faq.id}-en`] = ref;
                                                            }}
                                                            initialHtml={faq.answerHtmlEn}
                                                            placeholder="Answer (English)..."
                                                            minHeight="200px"
                                                            showPreviewToggle={true}
                                                            showSaveButton={false}
                                                            autoSave={false}
                                                            direction="ltr"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Arabic Column */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">المحتوى العربي</span>
                                                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800 dark:bg-green-900 dark:text-green-300">ARABIC</span>
                                                    </div>
                                                    <div dir="rtl">
                                                        <input
                                                            type="text"
                                                            value={faq.questionAr}
                                                            onChange={(e) => this.handleFAQQuestionChange(faq.id, 'ar', e.target.value)}
                                                            placeholder="السؤال (بالعربية)"
                                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                            dir="rtl"
                                                        />
                                                    </div>
                                                    <div dir="rtl">
                                                        <RichTextEditor
                                                            ref={(ref) => {
                                                                if (ref) this.editorRefs[`faq-${faq.id}-ar`] = ref;
                                                            }}
                                                            initialHtml={faq.answerHtmlAr}
                                                            placeholder="الإجابة (بالعربية)..."
                                                            minHeight="200px"
                                                            showPreviewToggle={true}
                                                            showSaveButton={false}
                                                            autoSave={false}
                                                            direction="rtl"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
}

export default withParams(BlogDetails);
