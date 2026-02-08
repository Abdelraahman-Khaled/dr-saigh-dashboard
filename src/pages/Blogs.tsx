import { Component } from 'react';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import PageMeta from '../components/common/PageMeta';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { getAllBlogs, createBlog, updateBlog, deleteBlog, getCategoryId, CATEGORIES, type Blog } from '../api/blog';

// interfaces are now imported from ../api/blog

interface BlogsState {
    blogs: Blog[];
    isModalOpen: boolean;
    editingId: string | null;
    activeTab: 'en' | 'ar';
    viewLanguage: 'en' | 'ar';

    // Form State
    formImageAr: string;
    formImageArId: number | null;
    photoFileAr: File | null;
    formImageEn: string;
    formImageEnId: number | null;
    photoFileEn: File | null;
    formCategory: string | number;
    formSlug: string;
    formSlugAr: string;
    formLink: string;

    // English Fields
    formTitleEn: string;
    formDescriptionEn: string;
    formImageAltEn: string;
    formItemTitleEn: string;
    formItemDescriptionEn: string;

    // Arabic Fields
    formTitleAr: string;
    formDescriptionAr: string;
    formImageAltAr: string;
    formItemTitleAr: string;
    formItemDescriptionAr: string;
    formIsPublished: boolean;
    isSaving: boolean;
}

// Wrapper for hook usage
const BlogsPageWrapper = () => {
    const navigate = useNavigate();
    return <BlogsPage navigate={navigate} />;
};

class BlogsPage extends Component<{ navigate: (path: string) => void }, BlogsState> {
    constructor(props: { navigate: (path: string) => void }) {
        super(props);
        this.state = {
            blogs: [],
            isModalOpen: false,
            editingId: null,
            activeTab: 'en',
            viewLanguage: 'en',

            formImageAr: '',
            formImageArId: null,
            photoFileAr: null,
            formImageEn: '',
            formImageEnId: null,
            photoFileEn: null,
            formCategory: CATEGORIES[0].id,
            formSlug: '',
            formSlugAr: '',
            formLink: '',

            formTitleEn: '',
            formDescriptionEn: '',
            formImageAltEn: '',
            formItemTitleEn: '',
            formItemDescriptionEn: '',

            formTitleAr: '',
            formDescriptionAr: '',
            formImageAltAr: '',
            formItemTitleAr: '',
            formItemDescriptionAr: '',
            formIsPublished: false,
            isSaving: false,
        };
    }

    componentDidMount() {
        this.loadBlogs();
    }

    loadBlogs = async () => {
        try {
            const blogs = (await getAllBlogs()).reverse();
            this.setState({ blogs });
        } catch (e) {
            console.error('Error loading blogs:', e);
        }
    };

    saveBlogs = (blogs: Blog[]) => {
        localStorage.setItem('blogs', JSON.stringify(blogs));
        this.setState({ blogs });
    };

    handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, lang: 'ar' | 'en') => {
        const file = e.target.files?.[0];
        if (file) {
            if (lang === 'ar') {
                this.setState({ photoFileAr: file });
            } else {
                this.setState({ photoFileEn: file });
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                if (lang === 'ar') {
                    this.setState({ formImageAr: reader.result as string });
                } else {
                    this.setState({ formImageEn: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        this.setState({ [name]: value } as unknown as Pick<BlogsState, keyof BlogsState>);
    };

    openModal = (blog?: Blog) => {
        if (blog) {
            this.setState({
                isModalOpen: true,
                editingId: blog.id,

                formImageAr: blog.imageAr || '',
                formImageArId: blog.imageArId || null,
                formImageEn: blog.imageEn || '',
                formImageEnId: blog.imageEnId || null,
                photoFileAr: null,
                photoFileEn: null,
                formCategory: getCategoryId(blog.category),
                formSlug: blog.slug || '',
                formSlugAr: blog.slugAr || '',
                formLink: blog.link || '',

                formTitleEn: blog.titleEn,
                formDescriptionEn: blog.descriptionEn || '',
                formImageAltEn: blog.imageAltEn,
                formItemTitleEn: blog.itemTitleEn || '',
                formItemDescriptionEn: blog.itemDescriptionEn || '',

                formTitleAr: blog.titleAr,
                formDescriptionAr: blog.descriptionAr || '',
                formImageAltAr: blog.imageAltAr,
                formItemTitleAr: blog.itemTitleAr || '',
                formItemDescriptionAr: blog.itemDescriptionAr || '',
                formIsPublished: blog.isPublished,
            });
        } else {
            this.setState({
                isModalOpen: true,
                editingId: null,

                formImageAr: '',
                formImageArId: null,
                photoFileAr: null,
                formImageEn: '',
                formImageEnId: null,
                photoFileEn: null,
                formCategory: CATEGORIES[0].id,
                formSlug: '',
                formSlugAr: '',
                formLink: '',

                formTitleEn: '',
                formDescriptionEn: '',
                formImageAltEn: '',
                formItemTitleEn: '',
                formItemDescriptionEn: '',

                formTitleAr: '',
                formDescriptionAr: '',
                formImageAltAr: '',
                formItemTitleAr: '',
                formItemDescriptionAr: '',
                formIsPublished: false,
            });
        }
    };

    closeModal = () => {
        this.setState({ isModalOpen: false, editingId: null });
    };



    handleSwitchViewLanguage = (lang: 'en' | 'ar') => {
        this.setState({ viewLanguage: lang });
    };

    handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const {
            editingId,
            photoFileAr, photoFileEn, formCategory, formSlug, formSlugAr,
            formTitleEn, formDescriptionEn, formImageAltEn, formItemTitleEn, formItemDescriptionEn,
            formTitleAr, formDescriptionAr, formImageAltAr, formItemTitleAr, formItemDescriptionAr,
            formIsPublished
        } = this.state;

        const blogData: Partial<Blog> & { photoFileAr?: File; photoFileEn?: File } = {
            photoFileAr: photoFileAr || undefined,
            photoFileEn: photoFileEn || undefined,
            imageArId: this.state.formImageArId || undefined,
            imageEnId: this.state.formImageEnId || undefined,
            category: formCategory,
            slug: formSlug,
            slugAr: formSlugAr,
            titleEn: formTitleEn,
            descriptionEn: formDescriptionEn,
            imageAltEn: formImageAltEn,
            itemTitleEn: formItemTitleEn,
            itemDescriptionEn: formItemDescriptionEn,
            titleAr: formTitleAr,
            descriptionAr: formDescriptionAr,
            imageAltAr: formImageAltAr,
            itemTitleAr: formItemTitleAr,
            itemDescriptionAr: formItemDescriptionAr,
            isPublished: formIsPublished,
        };

        this.setState({ isSaving: true });

        try {
            if (editingId) {
                await updateBlog(editingId, blogData);
                toast.success('Blog updated successfully!');
            } else {
                await createBlog(blogData);
                toast.success('Blog created successfully!');
            }
            this.loadBlogs();
            this.closeModal();
        } catch (error: any) {
            console.error('Error saving blog:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save blog.';
            toast.error(errorMessage);
        } finally {
            this.setState({ isSaving: false });
        }
    };

    handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this blog?')) {
            try {
                await deleteBlog(id);
                toast.success('Blog deleted successfully!');
                this.loadBlogs();
            } catch (error: any) {
                console.error('Error deleting blog:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to delete blog.';
                toast.error(errorMessage);
            }
        }
    };

    render() {
        const {
            blogs, isModalOpen, editingId, viewLanguage,
            formCategory, formSlug, formSlugAr,
            formTitleEn, formDescriptionEn, formImageAltEn, formItemTitleEn, formItemDescriptionEn,
            formTitleAr, formDescriptionAr, formImageAltAr, formItemTitleAr, formItemDescriptionAr,
            isSaving
        } = this.state;

        return (
            <div>
                <PageMeta
                    title="Blogs Management | TailAdmin"
                    description="Manage your blog posts"
                />
                <PageBreadcrumb pageTitle="Blogs Management" />

                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                Blogs
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Manage your blog posts
                            </p>
                        </div>
                        <button
                            onClick={() => this.openModal()}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Blog
                        </button>
                    </div>

                    {/* Blog Grid */}
                    <div className="space-y-4">
                        {/* List Language Toggle */}
                        <div className="flex justify-end">
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

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {blogs.map(blog => {
                                const title = viewLanguage === 'en' ? blog.titleEn : (blog.titleAr || 'No Arabic Title');
                                const imageAlt = viewLanguage === 'en' ? blog.imageAltEn : (blog.imageAltAr || 'No Arabic Alt');
                                const isRtl = viewLanguage === 'ar';

                                return (
                                    <div key={blog.id} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" dir={isRtl ? 'rtl' : 'ltr'}>
                                        <div className="absolute top-3 right-3 z-10">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${blog.isPublished
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {blog.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            {viewLanguage === 'en' ? (
                                                blog.imageEn ? (
                                                    <img
                                                        src={blog.imageEn}
                                                        alt={imageAlt}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-400">
                                                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )
                                            ) : (
                                                blog.imageAr ? (
                                                    <img
                                                        src={blog.imageAr}
                                                        alt={imageAlt}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-400">
                                                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-3">
                                                <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                    {blog.category}
                                                </span>
                                            </div>
                                            <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-white line-clamp-1">
                                                {title}
                                            </h3>
                                            <p className="mb-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Slug-ar: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{blog.slugAr}</span>
                                            </p>
                                            <p className="mb-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Slug-en: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{blog.slug}</span>
                                            </p>
                                            <p className="mb-4 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Alt: {imageAlt}
                                            </p>
                                            <Link
                                                to={`/blog/${blog.id}`}
                                                className="mb-4 block text-sm text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                More Details
                                            </Link>
                                            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800/50">
                                                <button
                                                    onClick={() => this.openModal(blog)}
                                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => this.handleDelete(blog.id)}
                                                    className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 backdrop-blur-sm">
                            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {editingId ? 'Edit Blog' : 'Add New Blog'}
                                    </h3>
                                    <button onClick={this.closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={this.handleSubmit} className="space-y-6">
                                    {/* SHARED FIELDS */}
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        {/* Category */}
                                        <div className="sm:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Category <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="formCategory"
                                                value={formCategory}
                                                onChange={(e) => this.setState({ formCategory: e.target.value })}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Slug <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="formSlug"
                                                value={formSlug}
                                                onChange={this.handleInputChange}
                                                required
                                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                placeholder="my-blog-post-slug"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Slug Ar<span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="formSlugAr"
                                                value={formSlugAr}
                                                onChange={this.handleInputChange}
                                                required
                                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                placeholder="العنوان-بالعربي"
                                            />
                                        </div>

                                        {/* Published Status */}
                                        <div className="sm:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Status
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => this.setState({ formIsPublished: !this.state.formIsPublished })}
                                                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${this.state.formIsPublished
                                                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400'
                                                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400'
                                                    }`}
                                            >
                                                <div className={`h-4 w-4 rounded-full border-2 ${this.state.formIsPublished ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'}`} />
                                                {this.state.formIsPublished ? 'Published' : 'Draft'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2">
                                        {/* ENGLISH FIELDS */}
                                        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/10">
                                            <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                                                <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">EN</span>
                                                English Content
                                            </h4>
                                            {/* Image Upload En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Blog Image (English)
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    {this.state.formImageEn && (
                                                        <img
                                                            src={this.state.formImageEn}
                                                            alt="Preview"
                                                            className="h-16 w-16 rounded-lg object-cover"
                                                        />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => this.handleFileChange(e, 'en')}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                                    />
                                                </div>
                                            </div>
                                            {/* Title En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Title <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formTitleEn"
                                                    value={formTitleEn}
                                                    onChange={this.handleInputChange}
                                                    required
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter blog title"
                                                />
                                            </div>
                                            {/* Description En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Description <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    name="formDescriptionEn"
                                                    value={formDescriptionEn}
                                                    onChange={this.handleInputChange}
                                                    required
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter blog description"
                                                />
                                            </div>
                                            {/* Alt Text En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Image Alt Text
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formImageAltEn"
                                                    value={formImageAltEn}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter image description"
                                                />
                                            </div>

                                            {/* Meta Title En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Meta Title
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formItemTitleEn"
                                                    value={formItemTitleEn}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="SEO Title"
                                                />
                                            </div>

                                            {/* Meta Description En */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Meta Description
                                                </label>
                                                <textarea
                                                    name="formItemDescriptionEn"
                                                    value={formItemDescriptionEn}
                                                    onChange={this.handleInputChange}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="SEO Description"
                                                />
                                            </div>
                                        </div>

                                        {/* ARABIC FIELDS */}
                                        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/10" dir="rtl">
                                            <h4 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                                                <span className="flex h-6 w-6 items-center justify-center rounded bg-green-100 text-xs font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">AR</span>
                                                المحتوى العربي
                                            </h4>
                                            {/* Image Upload Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    صورة المقال (عربي)
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    {this.state.formImageAr && (
                                                        <img
                                                            src={this.state.formImageAr}
                                                            alt="Preview"
                                                            className="h-16 w-16 rounded-lg object-cover"
                                                        />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => this.handleFileChange(e, 'ar')}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                                    />
                                                </div>
                                            </div>
                                            {/* Title Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    العنوان <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formTitleAr"
                                                    value={formTitleAr}
                                                    onChange={this.handleInputChange}
                                                    required
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل عنوان المقال"
                                                />
                                            </div>
                                            {/* Description Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    الوصف <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    name="formDescriptionAr"
                                                    value={formDescriptionAr}
                                                    onChange={this.handleInputChange}
                                                    required
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل وصف المقال"
                                                />
                                            </div>
                                            {/* Alt Text Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    نص بديل للصورة
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formImageAltAr"
                                                    value={formImageAltAr}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل وصف الصورة"
                                                />
                                            </div>
                                            {/* Meta Title Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    عنوان SEO
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formItemTitleAr"
                                                    value={formItemTitleAr}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="عنوان SEO"
                                                />
                                            </div>

                                            {/* Meta Description Ar */}
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    وصف SEO
                                                </label>
                                                <textarea
                                                    name="formItemDescriptionAr"
                                                    value={formItemDescriptionAr}
                                                    onChange={this.handleInputChange}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="وصف SEO"
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={this.closeModal}
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
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
                                                editingId ? 'Save Changes' : 'Create Blog'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default BlogsPageWrapper;
