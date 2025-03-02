import { colors } from "../colors";

export const sidebarStyles = (props) => ({
    ".sidebar": {
        position: "fixed",
        top: 0,
        left: 0,
        width: "200px",
        height: "100vh",
        background:
            props.colorMode === "light"
                ? colors.light.sidebar.background
                : colors.dark.sidebar.background,
        color: colors.light.sidebar.text,
        boxShadow: "lg",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontSize: "1rem !important",
        fontWeight: "700",
    },

    ".sidebar-patient-items": {
        backgroundColor:
            props.colorMode === "light"
                ? colors.light.sidebar.item
                : colors.dark.sidebar.item,
        color: colors.light.invertedText,
        height: "32px",
        fontSize: "1rem !important",
        fontWeight: "normal",
    },
    ".sidebar-patient-items:hover": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.sidebar.hover} !important`
                : `${colors.dark.sidebar.hover} !important`,
        color: colors.light.invertedText,
        cursor: "pointer !important",
    },
    ".sidebar-patient-items-delete": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.sidebar.hover} !important`
                : `${colors.dark.sidebar.hover} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".sidebar-patient-items-delete:hover": {
        backgroundColor: `${colors.light.buttonHover.danger} !important`,
        color: colors.light.invertedText,
    },
    ".new-patient": {
        padding: "2px",
        borderRadius: "sm",
        background: `${colors.light.tertiaryButton} !important`,
        marginTop: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "32px",
        fontWeight: "normal",
    },
    ".new-patient:hover": {
        background: `${colors.light.buttonHover.tertiary} !important`,
        cursor: "pointer !important",
    },
    ".patient": {
        padding: "2px",
        borderRadius: "sm",
        background: "gray.700",
        marginBottom: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    ".patient.hover": {
        background: "gray.600",
        cursor: "pointer",
    },
    ".settings": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "gray.400",
        padding: "2px",
        borderRadius: "sm",
        height: "30px",
        width: "100%",
    },
    ".settings:hover": {
        background: "gray.600",
        cursor: "pointer",
    },
    ".sidebar-toggle": {
        background:
            props.colorMode === "light"
                ? `${colors.light.sidebar.background} !important`
                : `${colors.dark.sidebar.background} !important`,
        color: `${colors.dark.textTertiary} !important`,
        zIndex: "200",
    },

    ".sidebar-toggle:hover": {
        background: "none",
    },
});
