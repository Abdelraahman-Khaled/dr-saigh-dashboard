import axiosInstance from "./axiosInstance";

export interface FAQ {
    id: number | string;
    questionEn: string;
    questionAr: string;
    answerEn: string;
    answerAr: string;
    isPublished: boolean;
}

interface RawFAQ {
    id: number;
    question_en: string;
    question_ar: string;
    answer_en: string;
    answer_ar: string;
    is_published: boolean;
}

export const getAllFAQs = async (): Promise<FAQ[]> => {
    const response = await axiosInstance.get('/faqs');
    const data: RawFAQ[] = response.data;

    return data.map(item => ({
        id: item.id,
        questionEn: item.question_en || '',
        questionAr: item.question_ar || '',
        answerEn: item.answer_en || '',
        answerAr: item.answer_ar || '',
        isPublished: item.is_published
    }));
};

export const createFAQ = async (data: Partial<FAQ>) => {
    const formData = new FormData();
    formData.append('faq[question_en]', data.questionEn || '');
    formData.append('faq[question_ar]', data.questionAr || '');
    formData.append('faq[answer_en]', data.answerEn || '');
    formData.append('faq[answer_ar]', data.answerAr || '');
    formData.append('faq[is_published]', data.isPublished ? 'true' : 'false');

    const response = await axiosInstance.post('/faqs', formData);
    return response.data;
};

export const updateFAQ = async (id: string | number, data: Partial<FAQ>) => {
    const formData = new FormData();
    formData.append('faq[question_en]', data.questionEn || '');
    formData.append('faq[question_ar]', data.questionAr || '');
    formData.append('faq[answer_en]', data.answerEn || '');
    formData.append('faq[answer_ar]', data.answerAr || '');
    formData.append('faq[is_published]', data.isPublished ? 'true' : 'false');

    const response = await axiosInstance.put(`/faqs/${id}`, formData);
    return response.data;
};

export const deleteFAQ = async (id: string | number) => {
    const response = await axiosInstance.delete(`/faqs/${id}`);
    return response.data;
};
