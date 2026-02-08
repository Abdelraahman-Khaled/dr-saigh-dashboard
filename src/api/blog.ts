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

    // If it's a string, it might be the name from backend (e.g. "Web_design")
    // or already mapped name from UI state.
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
// These match what the UI expects
export interface BlogBlock {
    id: string;
    contentEn: string;
    contentHtmlEn: string;
    contentAr: string;
    contentHtmlAr: string;
}

export interface BlogFAQ {
    id: string;
    questionEn: string;
    answerEn: string;
    answerHtmlEn: string;
    questionAr: string;
    answerAr: string;
    answerHtmlAr: string;
}

export interface BlogImage {
    id: string;
    url: string;
    name: string;
    altEn: string;
    altAr: string;
    relatedBlockId: string | "global" | null;
    file?: File; // For newly uploaded images
}

export interface Blog {
    id: string;
    image: string; // URL for list view
    imageAr: string;
    imageArId?: number;
    imageEn: string;
    imageEnId?: number;
    imageAltEn: string;
    imageAltAr: string;
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
    blocks: BlogBlock[];
    faqs?: BlogFAQ[];
    gallery?: BlogImage[];
    createdAt: string;
}

// --- API Response Types (SnakeCase) ---
// These match the raw server response
// These match the raw server response
interface RawBlogPhoto {
    id: number;
    url: string;
    alt: string;
    is_arabic: boolean;
}

interface RawBlogResponse {
   id: number;
    title_ar: string;
    title_en: string;
    category: string | number;
    slug: string;
    slug_ar: string;
    photos: RawBlogPhoto[];
    description_ar: string;
    description_en: string;
    meta_description_ar: string;
    meta_description_en: string;
    meta_title_ar: string;
    meta_title_en: string;
    is_published: boolean;
    // Note: blocks and faqs might need specific raw types if they are returned by getById
}

// --- Mapper Logic ---
const mapRawToBlog = (raw: RawBlogResponse): Blog => {
    const photoAr = raw.photos?.find(p => p.is_arabic);
    const photoEn = raw.photos?.find(p => !p.is_arabic);

    return {
        id: raw?.id?.toString() || "",
        image: photoEn?.url || photoAr?.url || "", // Fallback
        imageAr: photoAr?.url || "",
        imageArId: photoAr?.id,
        imageEn: photoEn?.url || "",
        imageEnId: photoEn?.id,
        imageAltEn: photoEn?.alt || "",
        imageAltAr: photoAr?.alt || "",
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
        createdAt: "", // Not provided in new snippet but should be preserved if available
    };
};
interface RawFAQResponse {
       id: number;
    question_ar: string;
    question_en: string;
    answer_ar: string;
    answer_en: string;
    blog_id: number;
    is_deleted: boolean;
    is_published: boolean;
    created_at: string;
}

const mapRawToFAQ = (raw: RawFAQResponse): BlogFAQ => ({
 id: raw.id.toString(),
    questionEn: raw.question_en || "",
    questionAr: raw.question_ar || "",
    answerEn: "", // JSON format not provided by GET faqs, we'll use HTML
    answerAr: "",
    answerHtmlEn: raw.answer_en || "",
    answerHtmlAr: raw.answer_ar || ""
});

// --- API Methods ---

/**
 * Get all blogs
 * GET /blogs
 */
export const getAllBlogs = async (): Promise<Blog[]> => {
    const response = await axiosInstance.get<RawBlogResponse[]>("/blogs");
    return response.data.map(mapRawToBlog);
};

/**
 * Get a single blog by ID
 * GET /blogs/:id
 */
export const getBlogById = async (id: string): Promise<Blog> => {
    const response = await axiosInstance.get<RawBlogResponse>(`/blogs/${id}`);
    return mapRawToBlog(response.data);
};

export interface BlogContents {
    blocks: BlogBlock[];
    gallery: BlogImage[];
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

/**
 * Get blog contents (blocks, gallery)
 * GET /blogs/:id/contents
 */
export const getBlogContents = async (blog_id: string): Promise<BlogContents> => {
    const response = await axiosInstance.get<RawContentBlock[]>(`/blogs/${blog_id}/contents`);

    const blocks: BlogBlock[] = response.data.map(raw => ({
        id: raw.id.toString(),
        contentEn: '',
        contentHtmlEn: raw.content_en || '',
        contentAr: '',
        contentHtmlAr: raw.content_ar || ''
    }));

    const gallery: BlogImage[] = [];
    response.data.forEach(raw => {
        if (raw.photos && Array.isArray(raw.photos)) {
            raw.photos.forEach((photo: any) => {
                if (photo && photo.url) {
                    gallery.push({
                        id: photo.cp_id ? photo.cp_id.toString() : photo.url, // Use cp_id if available
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

    return {
        blocks,
        gallery
    };
};

/**
 * Save blog structured content
 * POST /blogs/:id/contents
 */
export const saveBlogContents = async (blog_id: string, formData: FormData): Promise<void> => {

    await axiosInstance.post(`/blogs/${blog_id}/contents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/**
 * Create a new blog using FormData
 * POST /blogs
 */
export const createBlog = async (data: Partial<Blog> & { photoFileAr?: File; photoFileEn?: File }): Promise<Blog> => {
   const formData = new FormData();

    // Arabic Photo (Index 0)
    if (data.photoFileAr || data.imageAltAr !== undefined || data.imageArId) {
        if (data.imageArId) formData.append("blog[blog_photos_attributes][0][id]", data.imageArId.toString());
        if (data.photoFileAr) formData.append("blog[blog_photos_attributes][0][photo]", data.photoFileAr);
        formData.append("blog[blog_photos_attributes][0][alt_ar]", data.imageAltAr || "");
        formData.append("blog[blog_photos_attributes][0][is_arabic]", "1");
    }

    // English Photo (Index 1)
    if (data.photoFileEn || data.imageAltEn !== undefined || data.imageEnId) {
        if (data.imageEnId) formData.append("blog[blog_photos_attributes][1][id]", data.imageEnId.toString());
        if (data.photoFileEn) formData.append("blog[blog_photos_attributes][1][photo]", data.photoFileEn);
        formData.append("blog[blog_photos_attributes][1][alt_en]", data.imageAltEn || "");
        formData.append("blog[blog_photos_attributes][1][is_arabic]", "0");
    }

    if (data.titleAr) formData.append("blog[title_ar]", data.titleAr);
    if (data.descriptionAr) formData.append("blog[description_ar]", data.descriptionAr);
    if (data.descriptionEn) formData.append("blog[description_en]", data.descriptionEn);

    if (data.titleEn) formData.append("blog[title_en]", data.titleEn);
    if (data.itemTitleAr) formData.append("blog[meta_title_ar]", data.itemTitleAr);
    if (data.itemTitleEn) formData.append("blog[meta_title_en]", data.itemTitleEn);
    if (data.slug) formData.append("blog[slug]", data.slug);
    if (data.slugAr) formData.append("blog[slug_ar]", data.slugAr);
    if (data.itemDescriptionAr) formData.append("blog[meta_description_ar]", data.itemDescriptionAr);
    if (data.itemDescriptionEn) formData.append("blog[meta_description_en]", data.itemDescriptionEn);
    if (data.category !== undefined) {
        formData.append("blog[category]", getCategoryId(data.category).toString());
    }
    formData.append("blog[is_published]", data.isPublished ? "1" : "0");

   const response = await axiosInstance.post<RawBlogResponse>("/blogs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRawToBlog(response.data);
};
/**
 * Update an existing blog using FormData
 * PUT /blogs/:id
 */
export const updateBlog = async (id: string, data: Partial<Blog> & { photoFileAr?: File; photoFileEn?: File }): Promise<Blog> => {
      const formData = new FormData();

    // Arabic Photo (Index 0)
    if (data.photoFileAr || data.imageAltAr !== undefined || data.imageArId) {
        if (data.imageArId) formData.append("blog[blog_photos_attributes][0][id]", data.imageArId.toString());
        if (data.photoFileAr) formData.append("blog[blog_photos_attributes][0][photo]", data.photoFileAr);
        formData.append("blog[blog_photos_attributes][0][alt_ar]", data.imageAltAr || "");
        formData.append("blog[blog_photos_attributes][0][is_arabic]", "1");
    }

    // English Photo (Index 1)
    if (data.photoFileEn || data.imageAltEn !== undefined || data.imageEnId) {
        if (data.imageEnId) formData.append("blog[blog_photos_attributes][1][id]", data.imageEnId.toString());
        if (data.photoFileEn) formData.append("blog[blog_photos_attributes][1][photo]", data.photoFileEn);
        formData.append("blog[blog_photos_attributes][1][alt_en]", data.imageAltEn || "");
        formData.append("blog[blog_photos_attributes][1][is_arabic]", "0");
    }

    if (data.titleAr) formData.append("blog[title_ar]", data.titleAr);
    if (data.descriptionAr) formData.append("blog[description_ar]", data.descriptionAr);
    if (data.descriptionEn) formData.append("blog[description_en]", data.descriptionEn);

    if (data.titleEn) formData.append("blog[title_en]", data.titleEn);
    if (data.itemTitleAr) formData.append("blog[meta_title_ar]", data.itemTitleAr);
    if (data.itemTitleEn) formData.append("blog[meta_title_en]", data.itemTitleEn);
    if (data.slug) formData.append("blog[slug]", data.slug);
    if (data.slugAr) formData.append("blog[slug_ar]", data.slugAr);
    if (data.itemDescriptionAr) formData.append("blog[meta_description_ar]", data.itemDescriptionAr);
    if (data.itemDescriptionEn) formData.append("blog[meta_description_en]", data.itemDescriptionEn);
    if (data.category !== undefined) {
        formData.append("blog[category]", getCategoryId(data.category).toString());
    }
    if (data.isPublished !== undefined) formData.append("blog[is_published]", data.isPublished ? "1" : "0");


    // Note: Some APIs require POST with _method=PUT for multipart/form-data updates
    const response = await axiosInstance.put<RawBlogResponse>(`/blogs/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return mapRawToBlog(response.data);
};

/**
 * Get blog FAQs
 * GET /blogs/:id/faqs
 */
export const getBlogFAQs = async (blog_id: string): Promise<BlogFAQ[]> => {
    const response = await axiosInstance.get<RawFAQResponse[]>(`/blogs/${blog_id}/faqs`);
    return response.data.map(mapRawToFAQ);
};

/**
 * Create a new FAQ for a blog
 * POST /blogs/:id/faqs
 */
export const createBlogFAQ = async (blog_id: string, formData: FormData): Promise<void> => {

    await axiosInstance.post(`/blogs/${blog_id}/faqs`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/**
 * Update an existing FAQ
 * PUT /blogs/:blog_id/faqs/:id
 */
export const updateBlogFAQ = async (blog_id: string, faqId: string, formData: FormData): Promise<void> => {

    await axiosInstance.put(`/blogs/${blog_id}/faqs/${faqId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/**
 * Delete a specific FAQ
 * DELETE /blogs/:id/faqs/:faq_id
 */
export const deleteBlogFAQ = async (blog_id: string, faqId: string): Promise<void> => {
    await axiosInstance.delete(`/blogs/${blog_id}/faqs/${faqId}`);
};

/**
 * Delete a specific blog content section
 * DELETE /blogs/:blog_id/contents/:id
 */
export const deleteBlogContent = async (blog_id: string, contentId: string): Promise<void> => {
    await axiosInstance.delete(`/blogs/${blog_id}/contents/${contentId}`);
};

/**
 * Update a specific blog content section
 * PUT /blogs/:blog_id/contents/:id
 */
export const updateBlogContent = async (blog_id: string, contentId: string, formData: FormData): Promise<void> => {

    await axiosInstance.put(`/blogs/${blog_id}/contents/${contentId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

/**
 * Delete a blog
 * DELETE /blogs/:id
 */
export const deleteBlog = async (id: string): Promise<void> => {
    await axiosInstance.delete(`/blogs/${id}`);
};
