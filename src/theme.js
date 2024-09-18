// src/theme.js
import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === "light" ? "gray.800" : "#faf4ed",
      color: props.colorMode === "light" ? "whiteAlpha.900" : "gray.800",
    },
    ".main-bg": {
      backgroundColor: props.colorMode === "light" ? "#faf4ed" : "#191724",
    },
    ".headings": {
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      fontWeight: "700",
    },
    ".sidebar": {
      position: "fixed",
      top: 0,
      left: 0,
      width: "200px",
      height: "100vh",
      background: props.colorMode === "light" ? "#797593" : "#1f1d2e", // Adjust if necessary
      padding: "5px",
      color: "#f4ede8",
      boxShadow: "lg",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      fontSize: "1rem !important",
      fontWeight: "700",
    },
    ".sidebar-patient-items": {
      backgroundColor: props.colorMode === "light" ? "#9893a5" : "#6e6a86",
      color: "#f4ede8",
      height: "35px",
      fontSize: "1rem !important",
      fontWeight: "normal",
    },
    ".sidebar-patient-items:hover": {
      backgroundColor: "#56526e !important",
      color: "#f4ede8",
      cursor: "pointer !important",
    },
    ".sidebar-patient-items-delete": {
      backgroundColor: "#9893a5 !important",
      color: "#f4ede8",
    },
    ".sidebar-patient-items-delete:hover": {
      backgroundColor: "#9893a5 !important",
      color: "#f4ede8",
    },
    ".new-patient": {
      padding: "2px",
      borderRadius: "md",
      background: "#d7827e !important",
      marginTop: "2px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "35px",
      fontWeight: "normal",
    },
    ".new-patient:hover": {
      background: "#ea9a97 !important",
      cursor: "pointer !important",
    },
    ".patient": {
      padding: "2px",
      borderRadius: "md",
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
    ".nav-button": {
      marginTop: "4px",
      background: "teal.500",
      fontSize: "0.9rem",
      padding: "6px 12px",
      borderRadius: "5px",
    },
    ".nav-button:hover": {
      background: "teal.400",
    },
    ".small-nav-button": {
      marginTop: "4px",
      background: "teal.500",
      fontSize: "0.8rem",
      padding: "4px 8px",
      borderRadius: "5px",
    },
    ".small-nav-button:hover": {
      background: "teal.400",
    },
    ".custom-scrollbar": {
      scrollbarWidth: "thin",
      scrollbarColor: "#555 #222",
    },
    ".custom-scrollbar::-webkit-scrollbar": {
      width: "8px",
    },
    ".custom-scrollbar::-webkit-scrollbar-track": {
      background: "#222",
    },
    ".custom-scrollbar::-webkit-scrollbar-thumb": {
      backgroundColor: "#555",
      borderRadius: "10px",
      border: "2px solid #222",
    },
    ".textarea-style": {
      backgroundColor:
        props.colorMode === "light"
          ? "#faf4ed !important"
          : "#26233a !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#e0def4 !important",
      border: "none !important",
      resize: "none !important",
      fontSize: "0.9rem !important",
      padding: "8px !important",
      borderRadius: "4px !important",
      overflow: "hidden !important",
      whiteSpace: "pre-wrap !important",
      boxShadow: "none !important",
    },
    ".modal-style": {
      backgroundColor:
        props.colorMode === "light"
          ? "#fffaf3 !important"
          : "#1f1d2e !important", // Adjust if necessary
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "1px solid #2c2842 !important",
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      fontSize: "0.9rem !important",
      padding: "0px !important",
      borderRadius: "4px !important",
    },
    ".collapse-toggle": {
      border: "none !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#e0def4 !important",
      backgroundColor:
        props.colorMode === "light"
          ? "#f2e9de !important"
          : "#6e6a86 !important",
    },
    ".panels-bg": {
      backgroundColor: props.colorMode === "light" ? "#fffaf3" : "#1f1d2e", // Adjust if necessary
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      borderColor: "#cecacd",
      border: "none !important",
      fontSize: "1rem !important",
      fontWeight: "700",
    },
    ".summary-panels": {
      backgroundColor: props.colorMode === "light" ? "#fffaf3" : "#1f1d2e", // Adjust if necessary
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      borderColor: "#cecacd",
      border: "none !important",
      fontSize: "1rem !important",
      fontWeight: "normal",
    },
    ".summary-checkboxes": {
      backgroundColor: props.colorMode === "light" ? "#fffaf3" : "#1f1d2e", // Adjust if necessary
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
    },
    ".pill-box": {
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor:
        props.colorMode === "light"
          ? "#f2e9de !important"
          : "#1f1d2e !important",
      border: props.colorMode === "light" ? "1px solid #e0d8d3" : "none",
      padding: "10px 20px",
      borderRadius: "10px",
    },
    ".pill-box-icons": {
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#6e6a86 !important",
    },
    ".chat-icon": {
      backgroundColor:
        props.colorMode === "light"
          ? "#907aa9 !important"
          : "#6e6a86 !important",
      color:
        props.colorMode === "light"
          ? "#f4ede8 !important"
          : "#f4ede8 !important",
    },
    ".chat-panel": {
      backgroundColor: props.colorMode === "light" ? "#fffaf3" : "#1f1d2e", // Adjust if necessary
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "1px solid #2c2842 !important",
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      fontSize: "1rem !important",
      fontWeight: "700",
    },
    ".chat-main": {
      backgroundColor: props.colorMode === "light" ? "#f2e9e1" : "#26233a", // Adjust if necessary
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#908caa !important",
      fontWeight: "normal",
    },
    ".chat-suggestions": {
      backgroundColor:
        props.colorMode === "light"
          ? "#f4ede8 !important"
          : "#908caa !important", // Adjust if necessary
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      color:
        props.colorMode === "light"
          ? "#797593 !important"
          : "#e0def4 !important",
    },
    ".input-style": {
      backgroundColor:
        props.colorMode === "light"
          ? "#f4ede8 !important"
          : "#26233a !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#908caa !important",
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      padding: "7px 8px !important",
      borderRadius: "4px !important",
      fontSize: "0.9rem !important",
    },
    ".search-button": {
      borderLeft: "none !important",
      borderTopLeftRadius: "0 !important",
      borderBottomLeftRadius: "0 !important",
      marginLeft: "-5px",
      backgroundColor:
        props.colorMode === "light" ? "#ccc !important" : "#191724 !important",
      border:
        props.colorMode === "light"
          ? "1px solid #ccc !important"
          : "none !important",
      color: "#575279 !important",
    },
    ".search-button:hover": {
      backgroundColor:
        props.colorMode === "light"
          ? "#b3b3b3 !important"
          : "#393552 !important",
    },
    ".flex-container": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "50px",
    },
    ".transcript-mode": {
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor:
        props.colorMode === "light"
          ? "#f2e9de !important"
          : "#26233a !important",
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      color: "#575279 !important",
      fontSize: "0.9rem !important",
    },
    ".switch-mode": {
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor:
        props.colorMode === "light"
          ? "#f2e9de !important"
          : "#26233a !important",
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      color: "#575279 !important",
    },
    ".dark-toggle": {
      backgroundColor:
        props.colorMode === "light"
          ? "#f2e9de !important"
          : "#26233a !important",
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      color: "#575279 !important",
    },
    ".message-box": {
      padding: "10px",
      borderRadius: "8px",
      wordBreak: "break-word",
    },
    ".message-box.assistant": {
      backgroundColor: "#e0def4",
      color: "#575279",
    },
    ".message-box.user": {
      backgroundColor: "#907aa9",
      color: "#f4ede8",
    },
    ".message-box ul, .message-box ol": {
      paddingLeft: "20px",
    },
    ".chat-input": {
      backgroundColor:
        props.colorMode === "light"
          ? "#ffffff !important"
          : "#26233a !important",
      border:
        props.colorMode === "light"
          ? "1px solid #e0d8d3 !important"
          : "none !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#908caa !important",
    },
    ".red-button": {
      backgroundColor: "#b4637a !important",
      color: "#f4ede8 !important",
      height: "35px !important",
    },
    ".red-button:hover": {
      backgroundColor: "#eb6f92 !important",
      color: "#f4ede8 !important",
    },
    ".blue-button": {
      backgroundColor: "#ea9d34 !important",
      color: "#f4ede8 !important",
      height: "35px !important",
    },
    ".blue-button:hover": {
      backgroundColor: "#f6c177 !important",
      color: "#f4ede8 !important",
    },
    ".green-button": {
      backgroundColor: "#56949f !important",
      color: "#f4ede8 !important",
      height: "35px !important",
    },
    ".green-button:hover": {
      backgroundColor: "#9ccfd8 !important",
      color: "#f4ede8 !important",
    },
    ".settings-button": {
      backgroundColor: "#907aa9 !important",
      color: "#dfdad9 !important",
    },
    ".settings": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "gray.400",
      padding: "2px",
      borderRadius: "md",
      height: "30px",
      width: "100%",
    },
    ".settings:hover": {
      background: "gray.600",
      cursor: "pointer",
    },
    ".settings-button:hover": {
      backgroundColor: "#c4a7e7 !important",
      cursor: "pointer",
    },
    ".summary-buttons": {
      backgroundColor: "#56949f !important",
      color: "#dfdad9 !important",
    },
    ".summary-buttons:hover": {
      backgroundColor: "#9ccfd8 !important",
      cursor: "pointer",
      color: "#cecacd !important",
    },
    ".documentExplorer-style": {
      backgroundColor:
        props.colorMode === "light"
          ? "#faf4ed !important"
          : "#26233a !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#e0def4 !important",
      border: "none !important",
      resize: "none !important",
      fontSize: "0.9rem !important",
      borderRadius: "4px !important",
      overflow: "hidden !important",
      whiteSpace: "pre-wrap !important",
      boxShadow: "none !important",
    },
    ".documentExplorer-button": {
      backgroundColor: "none !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#e0def4 !important",
    },
    ".filelist-style": {
      backgroundColor:
        props.colorMode === "light"
          ? "#faf4ed !important"
          : "#26233a !important",
      color:
        props.colorMode === "light"
          ? "#575279 !important"
          : "#e0def4 !important",
    },

    ".task-checkbox": {
      ".chakra-checkbox__control": {
        borderWidth: "1px !important",
        border:
          props.colorMode === "light"
            ? "1px solid #e0d8d3 !important"
            : "1px solid #797593 !important",
        backgroundColor:
          props.colorMode === "light"
            ? "#f2e9de !important"
            : "#26233a !important",
        color:
          props.colorMode === "light"
            ? "#797593 !important"
            : "#908caa !important",
      },
      ".chakra-checkbox__label": {
        color:
          props.colorMode === "light"
            ? "#797593 !important"
            : "#908caa !important",
      },
    },
  }),
};

const theme = extendTheme({ config, styles });

export default theme;
