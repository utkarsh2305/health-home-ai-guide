import React, { useState, useRef } from "react";
import {
    Box,
    IconButton,
    Tooltip,
    HStack,
    useOutsideClick,
} from "@chakra-ui/react";
import { AddIcon, CloseIcon, ChatIcon } from "@chakra-ui/icons";
import { FaEnvelope } from "react-icons/fa";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

// Animation remains the same
const revealAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
`;

const ActionButtonWrapper = styled(Box)`
    animation: ${revealAnimation} 0.3s ease-out forwards;
`;

const FloatingActionMenu = ({
    onOpenChat,
    onOpenLetter,
    isChatOpen,
    isLetterOpen,
    // Remove forceMenuOpen prop and replace with these two:
    onMenuOpen, // New callback to inform parent when menu opens
    onMenuClose, // Renamed for clarity
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef();

    // Inform parent component when menu state changes
    const updateMenuState = (newState) => {
        setIsMenuOpen(newState);
        if (newState) {
            if (onMenuOpen) onMenuOpen();
        } else {
            if (onMenuClose) onMenuClose();
        }
    };

    useOutsideClick({
        ref: menuRef,
        handler: () => {
            // Only close menu if neither panel is open
            if (isMenuOpen && !isChatOpen && !isLetterOpen) {
                updateMenuState(false);
            }
        },
    });

    const toggleMenu = (e) => {
        e.stopPropagation();
        updateMenuState(!isMenuOpen);
    };

    // Update menu state when panels open/close
    React.useEffect(() => {
        // only force-open if we aren't already open
        if ((isChatOpen || isLetterOpen) && !isMenuOpen) {
            setIsMenuOpen(true);
        }
    }, [isChatOpen, isLetterOpen, isMenuOpen]);

    const mainFabIcon = isMenuOpen ? <CloseIcon /> : <AddIcon />;

    return (
        <Box
            position="fixed"
            bottom="20px"
            right="20px"
            zIndex="1050"
            ref={menuRef}
        >
            <HStack spacing={3} justifyContent="flex-end">
                {isMenuOpen && (
                    <>
                        <ActionButtonWrapper>
                            <Tooltip
                                label="Open Patient Letter"
                                placement="top"
                            >
                                <IconButton
                                    icon={<FaEnvelope />}
                                    onClick={() => {
                                        onOpenLetter();
                                        // Keep menu open when clicking action buttons
                                    }}
                                    aria-label="Open Letter"
                                    className="fam-action-button letter-fam-button"
                                    size="md"
                                    isRound
                                />
                            </Tooltip>
                        </ActionButtonWrapper>
                        <ActionButtonWrapper>
                            <Tooltip
                                label="Open Chat with Phlox"
                                placement="top"
                            >
                                <IconButton
                                    icon={<ChatIcon />}
                                    onClick={() => {
                                        onOpenChat();
                                        // Keep menu open when clicking action buttons
                                    }}
                                    aria-label="Open Chat"
                                    className="fam-action-button chat-fam-button"
                                    size="md"
                                    isRound
                                />
                            </Tooltip>
                        </ActionButtonWrapper>
                    </>
                )}
                <Tooltip
                    label={isMenuOpen ? "Close Menu" : "Open Actions Menu"}
                    placement="top"
                >
                    <IconButton
                        icon={mainFabIcon}
                        onClick={toggleMenu}
                        aria-label="Toggle Actions Menu"
                        size="lg"
                        isRound
                        className="fam-main-button"
                        boxShadow="xl"
                    />
                </Tooltip>
            </HStack>
        </Box>
    );
};

export default FloatingActionMenu;
