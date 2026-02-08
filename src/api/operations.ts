import axiosInstance from "./axiosInstance";

export const CATEGORIES = [
    { id: 1, name: 'Branding' },
    { id: 2, name: 'Web_design' },
    { id: 3, name: 'Graphic_design' },
    { id: 4, name: 'digital_marketing' },
    { id: 5, name: 'e_commerce' }
];

export const getCategoryName = (idOrName: string | number): string => {
    if (!idOrName) return "";

    const nameStr = String(idOrName);
    const foundByName = CATEGORIES.find(c => c.name.toLowerCase() === nameStr.toLowerCase());
    if (foundByName) return foundByName.name.replace(/_/g, ' ');

    const id = Number(idOrName);
    const foundById = CATEGORIES.find(c => c.id === id);
    return foundById ? foundById.name.replace(/_/g, ' ') : nameStr.replace(/_/g, ' ');
};

export const getCategoryId = (idOrName: string | number): number => {
    if (typeof idOrName === 'number') return idOrName;

    const nameStr = String(idOrName).replace(/ /g, '_').toLowerCase();
    const found = CATEGORIES.find(c => c.name.toLowerCase() === nameStr || c.name.toLowerCase() === String(idOrName).toLowerCase());

    if (found) return found.id;

    const id = Number(idOrName);
    return isNaN(id) ? CATEGORIES[0].id : id;
};

// --- Internal Types (CamelCase) ---
export interface OperationBlock {
    id: string;
    contentEn: string;
    contentHtmlEn: string;
    contentAr: string;
    contentHtmlAr: string;
}

export interface OperationFAQ {
    id: string;
    questionEn: string;
    answerEn: string;
    answerHtmlEn: string;
    questionAr: string;
    answerAr: string;
    answerHtmlAr: string;
}

export interface OperationImage {
    id: string;
    url: string;
    name: string;
    altEn: string;
    altAr: string;
    relatedBlockId: string | "global" | null;
    file?: File;
}

export interface Operation {
    id: string;
    image: string; // URL for list view (landing image)
    landingImage: string;
    landingImageId?: string;
    contentImage: string;
    contentImageId?: string;
    imageAltEn: string;
    imageAltAr: string;
    contentImageAltEn: string;
    contentImageAltAr: string;
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    itemTitleEn: string;
    itemDescriptionEn: string;
    itemTitleAr: string;
    itemDescriptionAr: string;
    category: string | number;
    slug: string;
    slugAr: string;
    link?: string;
    isPublished: boolean;
    blocks: OperationBlock[];
    faqs?: OperationFAQ[];
    gallery?: OperationImage[];
    createdAt: string;
}

// --- API Response Types (SnakeCase) ---
interface RawOperationPhoto {
    id: number;
    photo_url: string;
    is_landing: boolean;
    alt_ar: string;
    alt_en: string;
}

interface RawOperationResponse {
    id: number;
    photo: string | null;
    photo_url?: string;
    photos?: RawOperationPhoto[];
    title_ar: string;
    title_en: string;
    description_ar: string;
    description_en: string;
    image_alt_text_ar: string;
    image_alt_text_en: string;
    meta_title_ar: string;
    meta_title_en: string;
    meta_description_ar: string;
    meta_description_en: string;
    category: string | number;
    slug: string;
    slug_ar: string;
    is_published: number | boolean;
    created_at: string;
}

// --- Mapper Logic ---
const mapRawToOperation = (raw: RawOperationResponse): Operation => {
    const landingPhoto = raw.photos?.find(p => p.is_landing);
    const contentPhoto = raw.photos?.find(p => !p.is_landing);

    return {
        id: raw?.id?.toString() || "",
        image: landingPhoto?.photo_url || raw.photo_url || "",
        landingImage: landingPhoto?.photo_url || raw.photo_url || "",
        landingImageId: landingPhoto?.id?.toString(),
        contentImage: contentPhoto?.photo_url || "",
        contentImageId: contentPhoto?.id?.toString(),
        imageAltEn: landingPhoto?.alt_en || raw.image_alt_text_en || "",
        imageAltAr: landingPhoto?.alt_ar || raw.image_alt_text_ar || "",
        contentImageAltEn: contentPhoto?.alt_en || "",
        contentImageAltAr: contentPhoto?.alt_ar || "",
        titleEn: raw.title_en || "",
        titleAr: raw.title_ar || "",
        descriptionEn: raw.description_en || "",
        descriptionAr: raw.description_ar || "",
        itemTitleEn: raw.meta_title_en || "",
        itemDescriptionEn: raw.meta_description_en || "",
        itemTitleAr: raw.meta_title_ar || "",
        itemDescriptionAr: raw.meta_description_ar || "",
        category: getCategoryName(raw.category),
        slug: raw.slug || "",
        slugAr: raw.slug_ar || "",
        isPublished: !!raw.is_published,
        blocks: [],
        faqs: [],
        createdAt: raw.created_at,
    };
};

interface RawFAQResponse {
    id: number;
    question_ar: string;
    question_en: string;
    answer_ar: string;
    answer_en: string;
    operation_id: number;
    is_deleted: boolean;
    is_published: boolean;
    created_at: string;
}

const mapRawToFAQ = (raw: RawFAQResponse): OperationFAQ => ({
    id: raw.id.toString(),
    questionEn: raw.question_en || "",
    questionAr: raw.question_ar || "",
    answerEn: "",
    answerAr: "",
    answerHtmlEn: raw.answer_en || "",
    answerHtmlAr: raw.answer_ar || ""
});

// --- API Methods ---

export const getAllOperations = async (): Promise<Operation[]> => {
    const response = await axiosInstance.get<RawOperationResponse[]>("/operations");
    return response.data.map(mapRawToOperation);
};

export const getOperationById = async (id: string): Promise<Operation> => {
    const response = await axiosInstance.get<RawOperationResponse>(`/operations/${id}`);
    return mapRawToOperation(response.data);
};

export interface OperationContents {
    blocks: OperationBlock[];
    gallery: OperationImage[];
}

interface RawPhoto {
    cp_id?: number;
    url: string;
    alt_ar: string;
    alt_en: string;
}

interface RawContentBlock {
    id: number;
    content_ar: string;
    content_en: string;
    photos: RawPhoto[];
}

export const getOperationContents = async (operation_id: string): Promise<OperationContents> => {
    const response = await axiosInstance.get<RawContentBlock[]>(`/operations/${operation_id}/contents`);

    const blocks: OperationBlock[] = response.data.map(raw => ({
        id: raw.id.toString(),
        contentEn: '',
        contentHtmlEn: raw.content_en || '',
        contentAr: '',
        contentHtmlAr: raw.content_ar || ''
    }));

    const gallery: OperationImage[] = [];
    response.data.forEach(raw => {
        if (raw.photos && Array.isArray(raw.photos)) {
            raw.photos.forEach((photo: any) => {
                if (photo && photo.url) {
                    gallery.push({
                        id: photo.cp_id ? photo.cp_id.toString() : photo.url,
                        url: photo.url,
                        name: photo.url.split('/').pop() || 'image.webp',
                        altEn: photo.alt_en || '',
                        altAr: photo.alt_ar || '',
                        relatedBlockId: raw.id.toString()
                    });
                }
            });
        }
    });

    return { blocks, gallery };
};

export const saveOperationContents = async (operation_id: string, formData: FormData): Promise<void> => {
    await axiosInstance.post(`/operations/${operation_id}/contents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const createOperation = async (data: Partial<Operation> & { landingPhotoFile?: File; contentPhotoFile?: File }): Promise<Operation> => {
    const formData = new FormData();

    // Landing Image (Index 0)
    if (data.landingPhotoFile) {
        formData.append("operation[operation_photos_attributes][0][photo]", data.landingPhotoFile);
    }
    formData.append("operation[operation_photos_attributes][0][is_landing]", "1");
    formData.append("operation[operation_photos_attributes][0][alt_ar]", data.imageAltAr || "");
    formData.append("operation[operation_photos_attributes][0][alt_en]", data.imageAltEn || "");

    // Content Image (Index 1)
    if (data.contentPhotoFile) {
        formData.append("operation[operation_photos_attributes][1][photo]", data.contentPhotoFile);
    }
    formData.append("operation[operation_photos_attributes][1][is_landing]", "0");
    formData.append("operation[operation_photos_attributes][1][alt_ar]", data.contentImageAltAr || "");
    formData.append("operation[operation_photos_attributes][1][alt_en]", data.contentImageAltEn || "");

    if (data.titleAr) formData.append("operation[title_ar]", data.titleAr);
    if (data.titleEn) formData.append("operation[title_en]", data.titleEn);
    if (data.descriptionAr) formData.append("operation[description_ar]", data.descriptionAr);
    if (data.descriptionEn) formData.append("operation[description_en]", data.descriptionEn);
    if (data.itemTitleAr) formData.append("operation[meta_title_ar]", data.itemTitleAr);
    if (data.itemTitleEn) formData.append("operation[meta_title_en]", data.itemTitleEn);
    if (data.slug) formData.append("operation[slug]", data.slug);
    if (data.slugAr) formData.append("operation[slug_ar]", data.slugAr);
    if (data.itemDescriptionAr) formData.append("operation[meta_description_ar]", data.itemDescriptionAr);
    if (data.itemDescriptionEn) formData.append("operation[meta_description_en]", data.itemDescriptionEn);
    if (data.category !== undefined) {
        formData.append("operation[category]", getCategoryId(data.category).toString());
    }
    formData.append("operation[is_published]", data.isPublished ? "1" : "0");

    const response = await axiosInstance.post<RawOperationResponse>("/operations", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRawToOperation(response.data);
};

export const updateOperation = async (id: string, data: Partial<Operation> & { landingPhotoFile?: File; contentPhotoFile?: File }): Promise<Operation> => {
    const formData = new FormData();

    // Landing Image (Index 0)
    if (data.landingImageId) {
        formData.append("operation[operation_photos_attributes][0][id]", data.landingImageId);
    }
    if (data.landingPhotoFile) {
        formData.append("operation[operation_photos_attributes][0][photo]", data.landingPhotoFile);
    }
    formData.append("operation[operation_photos_attributes][0][is_landing]", "1");
    formData.append("operation[operation_photos_attributes][0][alt_ar]", data.imageAltAr || "");
    formData.append("operation[operation_photos_attributes][0][alt_en]", data.imageAltEn || "");

    // Content Image (Index 1)
    if (data.contentImageId) {
        formData.append("operation[operation_photos_attributes][1][id]", data.contentImageId);
    }
    if (data.contentPhotoFile) {
        formData.append("operation[operation_photos_attributes][1][photo]", data.contentPhotoFile);
    }
    formData.append("operation[operation_photos_attributes][1][is_landing]", "0");
    formData.append("operation[operation_photos_attributes][1][alt_ar]", data.contentImageAltAr || "");
    formData.append("operation[operation_photos_attributes][1][alt_en]", data.contentImageAltEn || "");

    if (data.titleAr) formData.append("operation[title_ar]", data.titleAr);
    if (data.titleEn) formData.append("operation[title_en]", data.titleEn);
    if (data.descriptionAr) formData.append("operation[description_ar]", data.descriptionAr);
    if (data.descriptionEn) formData.append("operation[description_en]", data.descriptionEn);
    if (data.itemTitleAr) formData.append("operation[meta_title_ar]", data.itemTitleAr);
    if (data.itemTitleEn) formData.append("operation[meta_title_en]", data.itemTitleEn);
    if (data.slug) formData.append("operation[slug]", data.slug);
    if (data.slugAr) formData.append("operation[slug_ar]", data.slugAr);
    if (data.itemDescriptionAr) formData.append("operation[meta_description_ar]", data.itemDescriptionAr);
    if (data.itemDescriptionEn) formData.append("operation[meta_description_en]", data.itemDescriptionEn);
    if (data.category !== undefined) {
        formData.append("operation[category]", getCategoryId(data.category).toString());
    }
    if (data.isPublished !== undefined) formData.append("operation[is_published]", data.isPublished ? "1" : "0");

    const response = await axiosInstance.put<RawOperationResponse>(`/operations/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRawToOperation(response.data);
};

export const getOperationFAQs = async (operation_id: string): Promise<OperationFAQ[]> => {
    const response = await axiosInstance.get<RawFAQResponse[]>(`/operations/${operation_id}/faqs`);
    return response.data.map(mapRawToFAQ);
};

export const createOperationFAQ = async (operation_id: string, formData: FormData): Promise<void> => {
    await axiosInstance.post(`/operations/${operation_id}/faqs`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const updateOperationFAQ = async (operation_id: string, faqId: string, formData: FormData): Promise<void> => {
    await axiosInstance.put(`/operations/${operation_id}/faqs/${faqId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const deleteOperationFAQ = async (operation_id: string, faqId: string): Promise<void> => {
    await axiosInstance.delete(`/operations/${operation_id}/faqs/${faqId}`);
};

export const deleteOperationContent = async (operation_id: string, contentId: string): Promise<void> => {
    await axiosInstance.delete(`/operations/${operation_id}/contents/${contentId}`);
};

export const updateOperationContent = async (operation_id: string, contentId: string, formData: FormData): Promise<void> => {
    await axiosInstance.put(`/operations/${operation_id}/contents/${contentId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const deleteOperation = async (id: string): Promise<void> => {
    await axiosInstance.delete(`/operations/${id}`);
};
