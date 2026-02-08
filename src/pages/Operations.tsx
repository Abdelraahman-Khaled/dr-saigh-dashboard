import { Component } from 'react';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import PageMeta from '../components/common/PageMeta';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { getAllOperations, createOperation, updateOperation, deleteOperation, getCategoryId, CATEGORIES, type Operation } from '../api/operations';

interface OperationsState {
    operations: Operation[];
    isModalOpen: boolean;
    editingId: string | null;
    activeTab: 'en' | 'ar';
    viewLanguage: 'en' | 'ar';

    // Form State
    formLandingImage: string;
    landingPhotoFile: File | null;
    landingImageId: string | null;

    formContentImage: string;
    contentPhotoFile: File | null;
    contentImageId: string | null;

    formCategory: string | number;
    formSlug: string;
    formSlugAr: string;
    formLink: string;

    // English Fields
    formTitleEn: string;
    formDescriptionEn: string;
    formImageAltEn: string;
    formContentImageAltEn: string;
    formItemTitleEn: string;
    formItemDescriptionEn: string;

    // Arabic Fields
    formTitleAr: string;
    formDescriptionAr: string;
    formImageAltAr: string;
    formContentImageAltAr: string;
    formItemTitleAr: string;
    formItemDescriptionAr: string;
    
    formIsPublished: boolean;
    isSaving: boolean;
}

// Wrapper for hook usage
const OperationsPageWrapper = () => {
    const navigate = useNavigate();
    return <OperationsPage navigate={navigate} />;
};

class OperationsPage extends Component<{ navigate: (path: string) => void }, OperationsState> {
    constructor(props: { navigate: (path: string) => void }) {
        super(props);
        this.state = {
            operations: [],
            isModalOpen: false,
            editingId: null,
            activeTab: 'en',
            viewLanguage: 'en',

            formLandingImage: '',
            landingPhotoFile: null,
            landingImageId: null,

            formContentImage: '',
            contentPhotoFile: null,
            contentImageId: null,

            formCategory: CATEGORIES[0].id,
            formSlug: '',
            formSlugAr: '',
            formLink: '',

            formTitleEn: '',
            formDescriptionEn: '',
            formImageAltEn: '',
            formContentImageAltEn: '',
            formItemTitleEn: '',
            formItemDescriptionEn: '',

            formTitleAr: '',
            formDescriptionAr: '',
            formImageAltAr: '',
            formContentImageAltAr: '',
            formItemTitleAr: '',
            formItemDescriptionAr: '',
            formIsPublished: false,
            isSaving: false,
        };
    }

    componentDidMount() {
        this.loadOperations();
    }

    loadOperations = async () => {
        try {
            const operations = (await getAllOperations()).reverse();
            this.setState({ operations });
        } catch (e) {
            console.error('Error loading operations:', e);
        }
    };

    handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'landing' | 'content') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'landing') {
                this.setState({ landingPhotoFile: file });
            } else {
                this.setState({ contentPhotoFile: file });
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'landing') {
                    this.setState({ formLandingImage: reader.result as string });
                } else {
                    this.setState({ formContentImage: reader.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        this.setState({ [name]: value } as unknown as Pick<OperationsState, keyof OperationsState>);
    };

    openModal = (operation?: Operation) => {
        if (operation) {
            this.setState({
                isModalOpen: true,
                editingId: operation.id,

                formLandingImage: operation.landingImage || '',
                landingPhotoFile: null,
                landingImageId: operation.landingImageId || null,

                formContentImage: operation.contentImage || '',
                contentPhotoFile: null,
                contentImageId: operation.contentImageId || null,

                formCategory: getCategoryId(operation.category),
                formSlug: operation.slug || '',
                formSlugAr: operation.slugAr || '',
                formLink: operation.link || '',

                formTitleEn: operation.titleEn || '',
                formDescriptionEn: operation.descriptionEn || '',
                formImageAltEn: operation.imageAltEn || '',
                formContentImageAltEn: operation.contentImageAltEn || '',
                formItemTitleEn: operation.itemTitleEn || '',
                formItemDescriptionEn: operation.itemDescriptionEn || '',

                formTitleAr: operation.titleAr || '',
                formDescriptionAr: operation.descriptionAr || '',
                formImageAltAr: operation.imageAltAr || '',
                formContentImageAltAr: operation.contentImageAltAr || '',
                formItemTitleAr: operation.itemTitleAr || '',
                formItemDescriptionAr: operation.itemDescriptionAr || '',
                formIsPublished: operation.isPublished,
            });
        } else {
            this.setState({
                isModalOpen: true,
                editingId: null,

                formLandingImage: '',
                landingPhotoFile: null,
                landingImageId: null,

                formContentImage: '',
                contentPhotoFile: null,
                contentImageId: null,

                formCategory: CATEGORIES[0].id,
                formSlug: '',
                formSlugAr: '',
                formLink: '',

                formTitleEn: '',
                formDescriptionEn: '',
                formImageAltEn: '',
                formContentImageAltEn: '',
                formItemTitleEn: '',
                formItemDescriptionEn: '',

                formTitleAr: '',
                formDescriptionAr: '',
                formImageAltAr: '',
                formContentImageAltAr: '',
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
            landingPhotoFile, landingImageId,
            contentPhotoFile, contentImageId,
            formCategory, formSlug, formSlugAr,
            formTitleEn, formDescriptionEn, formImageAltEn, formContentImageAltEn, formItemTitleEn, formItemDescriptionEn,
            formTitleAr, formDescriptionAr, formImageAltAr, formContentImageAltAr, formItemTitleAr, formItemDescriptionAr,
            formIsPublished
        } = this.state;

        const operationData: Partial<Operation> & { landingPhotoFile?: File; contentPhotoFile?: File } = {
            landingPhotoFile: landingPhotoFile || undefined,
            landingImageId: landingImageId || undefined,
            contentPhotoFile: contentPhotoFile || undefined,
            contentImageId: contentImageId || undefined,
            category: formCategory,
            slug: formSlug,
            slugAr: formSlugAr,
            titleEn: formTitleEn,
            descriptionEn: formDescriptionEn,
            imageAltEn: formImageAltEn,
            contentImageAltEn: formContentImageAltEn,
            itemTitleEn: formItemTitleEn,
            itemDescriptionEn: formItemDescriptionEn,
            titleAr: formTitleAr,
            descriptionAr: formDescriptionAr,
            imageAltAr: formImageAltAr,
            contentImageAltAr: formContentImageAltAr,
            itemTitleAr: formItemTitleAr,
            itemDescriptionAr: formItemDescriptionAr,
            isPublished: formIsPublished,
        };

        this.setState({ isSaving: true });

        try {
            if (editingId) {
                await updateOperation(editingId, operationData);
                toast.success('Operation updated successfully!');
            } else {
                await createOperation(operationData);
                toast.success('Operation created successfully!');
            }
            this.loadOperations();
            this.closeModal();
        } catch (error: any) {
            console.error('Error saving operation:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save operation.';
            toast.error(errorMessage);
        } finally {
            this.setState({ isSaving: false });
        }
    };

    handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this operation?')) {
            try {
                await deleteOperation(id);
                toast.success('Operation deleted successfully!');
                this.loadOperations();
            } catch (error: any) {
                console.error('Error deleting operation:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to delete operation.';
                toast.error(errorMessage);
            }
        }
    };

    render() {
        const {
            operations, isModalOpen, editingId, viewLanguage,
            formCategory, formSlug, formSlugAr,
            formTitleEn, formDescriptionEn, formImageAltEn, formContentImageAltEn, formItemTitleEn, formItemDescriptionEn,
            formTitleAr, formDescriptionAr, formImageAltAr, formContentImageAltAr, formItemTitleAr, formItemDescriptionAr,
            isSaving
        } = this.state;

        return (
            <div>
                <PageMeta
                    title="Operations Management | TailAdmin"
                    description="Manage your operations"
                />
                <PageBreadcrumb pageTitle="Operations Management" />

                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                Operations
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Manage your operations
                            </p>
                        </div>
                        <button
                            onClick={() => this.openModal()}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Operation
                        </button>
                    </div>

                    {/* Operation Grid */}
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
                            {operations.map(operation => {
                                const isRtl = viewLanguage === 'ar';
                                const title = isRtl ? (operation.titleAr || 'Untitled') : operation.titleEn;
                                const dir = isRtl ? 'rtl' : 'ltr';

                                return (
                                    <div key={operation.id} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" dir={dir}>
                                        <div className="absolute top-3 right-3 z-10">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${operation.isPublished
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {operation.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            {viewLanguage === 'ar' ? (
                                                operation.contentImage ? (
                                                    <img
                                                        src={operation.contentImage}
                                                        alt={operation.contentImageAltAr || ''}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-400">No Content Image</div>
                                                )
                                            ) : (
                                                operation.landingImage ? (
                                                    <img
                                                        src={operation.landingImage}
                                                        alt={operation.imageAltEn || ''}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-gray-400">No Landing Image</div>
                                                )
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="mb-3">
                                                <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                    {operation.category}
                                                </span>
                                            </div>
                                            <h3 className="mb-2 text-lg font-bold text-gray-800 dark:text-white line-clamp-1">
                                                {title}
                                            </h3>
                                            <p className="mb-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Slug-ar: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{operation.slugAr}</span>
                                            </p>
                                            <p className="mb-2 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Slug-en: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{operation.slug}</span>
                                            </p>
                                            <p className="mb-4 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                                                Alt: {viewLanguage === 'ar' ? (operation.contentImageAltAr || '') : (operation.imageAltEn || '')}
                                            </p>
                                            <Link
                                                to={`/operation/${operation.id}`}
                                                className="mb-4 block text-sm text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                More Details
                                            </Link>
                                            <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800/50">
                                                <button
                                                    onClick={() => this.openModal(operation)}
                                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => this.handleDelete(operation.id)}
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
                            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                                <div className="mb-6 flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {editingId ? 'Edit Operation' : 'Add New Operation'}
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
                                                {/* Image Upload Landing */}
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/10">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Landing Image <span className="text-xs text-gray-500"></span>
                                            </label>
                                            <div className="flex flex-col gap-4">
                                                {this.state.formLandingImage && (
                                                    <img
                                                        src={this.state.formLandingImage}
                                                        alt="Landing Preview"
                                                        className="h-32 w-full rounded-lg object-cover"
                                                    />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => this.handleFileChange(e, 'landing')}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Image Upload Content */}
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/10">
                                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Content Image <span className="text-xs text-gray-500"></span>
                                            </label>
                                            <div className="flex flex-col gap-4">
                                                {this.state.formContentImage && (
                                                    <img
                                                        src={this.state.formContentImage}
                                                        alt="Content Preview"
                                                        className="h-32 w-full rounded-lg object-cover"
                                                    />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => this.handleFileChange(e, 'content')}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                                                />
                                            </div>
                                        </div>
                                        <div>
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
                                                placeholder="my-operation-slug"
                                            />
                                        </div>
                                        <div>
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
                                                    placeholder="Enter operation title"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Description
                                                </label>
                                                <textarea
                                                    name="formDescriptionEn"
                                                    value={formDescriptionEn}
                                                    onChange={this.handleInputChange}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter short description"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Landing Image Alt
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formImageAltEn"
                                                    value={formImageAltEn}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter landing image alt"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Content Image Alt
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formContentImageAltEn"
                                                    value={formContentImageAltEn}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="Enter content image alt"
                                                />
                                            </div>
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
                                                    placeholder="أدخل عنوان العملية"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    الوصف
                                                </label>
                                                <textarea
                                                    name="formDescriptionAr"
                                                    value={formDescriptionAr}
                                                    onChange={this.handleInputChange}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل وصفاً قصيراً"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    نص بديل لصورة الغلاف
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formImageAltAr"
                                                    value={formImageAltAr}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل وصف صورة الغلاف"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    نص بديل لصورة المحتوى
                                                </label>
                                                <input
                                                    type="text"
                                                    name="formContentImageAltAr"
                                                    value={formContentImageAltAr}
                                                    onChange={this.handleInputChange}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                    placeholder="أدخل وصف صورة المحتوى"
                                                />
                                            </div>
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
                                                editingId ? 'Save Changes' : 'Create Operation'
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

export default OperationsPageWrapper;
