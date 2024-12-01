export const validatePassword = (password) => {
    // Regular expression for validation
    const regex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!])[a-zA-Z\d@#$%^&+=!]{8,16}$/;

    if (regex.test(password)) {
        return true; // Password is valid
    } else {
        return false; // Password is invalid
    }
};
