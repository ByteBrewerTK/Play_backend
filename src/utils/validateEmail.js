const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
];

export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const isReputedEmail = (email) => {
    const domain = email.split("@")[1];
    return allowedDomains.includes(domain);
};

export const validateReputedEmail = (email) => {
    if (!validateEmail(email)) {
        console.log("Invalid email format");
        return false;
    }

    if (!isReputedEmail(email)) {
        console.log("Email domain is not allowed");
        return false;
    }

    console.log("Email is valid and from a reputed domain");
    return true;
};
