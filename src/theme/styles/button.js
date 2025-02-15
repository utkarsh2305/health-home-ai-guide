// Styles for button components
import { colors } from "../colors";

export const buttonStyles = (props) => ({
    ".refresh-icon-button": {
        backgroundColor:
            props.colorMode === "light"
                ? colors.light.neutralButton
                : colors.dark.neutralButton,
        color:
            props.colorMode === "light"
                ? colors.light.invertedText
                : colors.dark.invertedText,
        _hover: {
            backgroundColor:
                props.colorMode === "light"
                    ? colors.light.buttonHover.neutral
                    : colors.dark.buttonHover.neutral,
        },
        _active: {
            backgroundColor:
                props.colorMode === "light"
                    ? colors.light.neutralButton
                    : colors.dark.neutralButton,
        },
    },
    ".nav-button": {
        marginTop: "4px",
        background: colors.light.primaryButton,
        fontSize: "0.9rem",
        padding: "6px 12px",
        borderRadius: "5px",
    },
    ".nav-button:hover": {
        background: colors.light.buttonHover.primary,
    },
    ".small-nav-button": {
        marginTop: "4px",
        background: colors.light.primaryButton,
        fontSize: "0.8rem",
        padding: "4px 8px",
        borderRadius: "5px",
    },
    ".small-nav-button:hover": {
        background: colors.light.buttonHover.primary,
    },
    ".summary-buttons": {
        backgroundColor: `${colors.light.primaryButton} !important`,
        color: `${colors.light.invertedText} !important`,
        borderRadius: "sm !important",
    },
    ".summary-buttons:hover": {
        backgroundColor: `${colors.light.buttonHover.primary} !important`,
        cursor: "pointer",
    },
    ".red-button": {
        backgroundColor: `${colors.light.dangerButton} !important`,
        color: `${colors.light.invertedText} !important`,
        height: "35px !important",
        borderRadius: "sm !important",
    },
    ".red-button:hover": {
        backgroundColor: `${colors.light.buttonHover.danger} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".tertiary-button": {
        backgroundColor: `${colors.light.tertiaryButton} !important`,
        color: `${colors.light.base} !important`,
        height: "35px !important",
        borderRadius: "sm !important",
    },
    ".tertiary-button:hover": {
        backgroundColor: `${colors.light.buttonHover.tertiary} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".blue-button": {
        backgroundColor: `${colors.light.secondaryButton} !important`,
        color: `${colors.light.invertedText} !important`,
        height: "35px !important",
        borderRadius: "sm !important",
    },
    ".blue-button:hover": {
        backgroundColor: `${colors.light.buttonHover.secondary} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".green-button": {
        backgroundColor: `${colors.light.successButton} !important`,
        color: `${colors.light.invertedText} !important`,
        height: "35px !important",
        borderRadius: "sm !important",
    },
    ".green-button:hover": {
        backgroundColor: `${colors.light.buttonHover.success} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".settings-button": {
        backgroundColor: `${colors.light.neutralButton} !important`,
        color: `${colors.light.invertedText} !important`,
    },
    ".settings-button:hover": {
        backgroundColor: `${colors.light.buttonHover.neutral} !important`,
        cursor: "pointer",
    },
    ".template-select-button": {
        borderRadius: "md !important",
        fontWeight: "normal",

        border:
            props.colorMode === "light"
                ? `1px solid ${colors.light.surface} !important`
                : `1px solid ${colors.dark.surface} !important`,
        // Default (outline) state
        "&[variant=outline]": {
            backgroundColor:
                props.colorMode === "light"
                    ? `${colors.light.crust} !important`
                    : `${colors.dark.overlay0} !important`,
            color:
                props.colorMode === "light"
                    ? `${colors.light.textSecondary} !important`
                    : `${colors.dark.textSecondary} !important`,
            _hover: {
                backgroundColor:
                    props.colorMode === "light"
                        ? `${colors.light.crust} !important`
                        : `${colors.dark.surface1} !important`, // Slightly different hover background
            },
        },
        // Solid state (when selected)
        "&[variant=solid]": {
            backgroundColor:
                props.colorMode === "light"
                    ? `${colors.light.crust} !important`
                    : `${colors.dark.overlay0} !important`,
            color:
                props.colorMode === "light"
                    ? `${colors.light.textPrimary} !important`
                    : `${colors.dark.textPrimary} !important`,
            _hover: {
                backgroundColor:
                    props.colorMode === "light"
                        ? `${colors.light.surface} !important`
                        : `${colors.dark.surface2} !important`, // Slightly different hover for solid
            },
        },
    },
});
