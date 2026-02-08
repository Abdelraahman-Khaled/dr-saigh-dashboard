import axiosInstance from "./axiosInstance";

/**
 * Sign In function
 * POST /users/sign_in
 * Note: Adjust endpoint if different in your backend
 */
export const signIn = async (data: Record<string, string>) => {
    const response = await axiosInstance.post("/login", {
        email: data.email,
        password: data.password,
    });

    // If the backend returns a token, it's usually handled by the axiosInstance interceptors
    // for storage, but we return the data here for component use.
    return response.data;
};

/**
 * Sign Up function
 * POST /users
 * Note: Adjust endpoint if different in your backend
 */
export const signUp = async (data: Record<string, string>) => {
    const formData = new FormData();

    // Specific fields requested by user
    formData.append("user[name]", data.name);
    formData.append("user[email]", data.email);
    formData.append("user[password]", data.password);
    formData.append("user[password_confirmation]", data.passwordConfirmation);


    const response = await axiosInstance.post("/signup", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
};
