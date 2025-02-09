// Styles for text input fields and buttons.
import { colors } from "../colors";
import { lightenColor } from "../utils"; // adjust path as needed

export const inputStyles = (props) => ({
    ".textarea-style": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.base} !important`
                : `${colors.dark.crust} !important`,
        color:
            props.colorMode === "light"
                ? `${colors.light.textTertiary} !important`
                : `${colors.dark.textTertiary} !important`,
        border: "none !important",
        resize: "none !important",
        fontSize: "0.9rem !important",
        padding: "8px !important",
        borderRadius: "4px !important",
        overflow: "hidden !important",
        whiteSpace: "pre-wrap !important",
        boxShadow: "none !important",
        "&::placeholder": {
            color:
                props.colorMode === "light"
                    ? colors.light.overlay0
                    : colors.dark.overlay0,
        },
        "&:focus": {
            outline: "none !important",
            boxShadow: "none !important",
            border: "none !important",
        },
        minHeight: "auto !important",
    },
    ".input-style": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.base} !important`
                : `${colors.dark.crust} !important`,
        color:
            props.colorMode === "light"
                ? `${colors.light.textTertiary} !important`
                : `${colors.dark.textTertiary} !important`,
        border:
            props.colorMode === "light"
                ? `1px solid ${colors.light.surface} !important`
                : `${colors.dark.textTertiary} !important`,
        padding: "7px 8px !important",
        borderRadius: "sm !important",
        fontSize: "0.9rem !important",
    },
    ".chat-input": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.base} !important`
                : `${colors.dark.crust} !important`,
        border:
            props.colorMode === "light"
                ? `1px solid ${colors.light.surface} !important`
                : `${colors.dark.textTertiary} !important`,
        color:
            props.colorMode === "light"
                ? `${colors.light.textTertiary} !important`
                : `${colors.dark.textSecondary} !important`,
    },
    ".search-button": {
        borderLeft: "none !important",
        borderTopLeftRadius: "0 !important",
        borderBottomLeftRadius: "0 !important",
        borderTopRightRadius: "md !important",
        borderBottomRightRadius: "md !important",
        marginLeft: "-5px",
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.surface2} !important`
                : `${colors.dark.base} !important`,
        border:
            props.colorMode === "light"
                ? `1px solid ${colors.light.surface2} !important`
                : `${colors.dark.textTertiary} !important`,
        color: "#575279 !important",
    },
    ".search-button:hover": {
        backgroundColor:
            props.colorMode === "light"
                ? `${colors.light.surface} !important`
                : `${colors.dark.surface2} !important`,
    },
    ".template-field-container": {
        backgroundColor:
            props.colorMode === "light"
                ? colors.light.surface
                : colors.dark.surface,
        borderRadius: "sm",
        padding: "1rem",
        marginBottom: "1rem",
        border:
            props.colorMode === "light"
                ? `1px solid ${colors.light.surface2}`
                : `1px solid ${colors.dark.surface2}`,
    },

    ".template-field-header": {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },

    ".template-field-label": {
        color:
            props.colorMode === "light"
                ? colors.light.textPrimary
                : colors.dark.textPrimary,
    },
    ".textarea-container": {
        position: "relative",
        width: "100%",
        "&:hover .refinement-fab": {
            opacity: 1,
        },
    },
    ".refinement-fab": {
        borderRadius: "full !important",
        backgroundColor: `${
            props.colorMode === "light"
                ? colors.light.extraButton
                : colors.dark.extraButton
        } !important`,
        opacity: 0,
        transition: "opacity 0.2s ease-in-out",
        width: "40px !important",
        height: "40px !important",
        aspectRatio: "1/1",
        "&:hover": {
            backgroundColor: `${
                props.colorMode === "light"
                    ? lightenColor(colors.light.extraButton)
                    : lightenColor(colors.dark.extraButton)
            } !important`,
        },
    },
    ".refinement-submit-button": {
        borderRadius: "sm !important",
        color: `${colors.light.invertedText} !important`,
        backgroundColor: `${
            props.colorMode === "light"
                ? colors.light.extraButton
                : colors.dark.extraButton
        } !important`,
        "&:hover": {
            backgroundColor: `${
                props.colorMode === "light"
                    ? lightenColor(colors.light.extraButton)
                    : lightenColor(colors.dark.extraButton)
            } !important`,
        },
    },
});
