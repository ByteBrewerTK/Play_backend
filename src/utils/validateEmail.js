const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "aol.com",
    "protonmail.com",
    "zohomail.com",
    "zohomail.in",
    "bytebrewer.site",
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
    return validateEmail(email) && isReputedEmail(email);
};
