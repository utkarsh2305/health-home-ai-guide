import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
    Box,
    Text,
    Flex,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Badge,
    Tooltip,
    Link,
    VStack,
    HStack,
} from "@chakra-ui/react";
import { FaGithub } from "react-icons/fa";
import { TbVersions } from "react-icons/tb";
import { BsCheck2All, BsExclamationTriangle } from "react-icons/bs";

const VersionInfo = ({ isCollapsed }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [version, setVersion] = useState("");
    const [changelog, setChangelog] = useState("");
    const [serverStatus, setServerStatus] = useState({
        whisper: false,
        ollama: false,
    });

    useEffect(() => {
        // Fetch version from backend
        fetch("/api/config/version")
            .then((res) => res.json())
            .then((data) => {
                setVersion(data.version);
            })
            .catch((err) => console.error("Error fetching version:", err));

        // Fetch changelog
        fetch("/api/config/changelog")
            .then((res) => res.json())
            .then((data) => {
                setChangelog(data.content);
            })
            .catch((err) => console.error("Error fetching changelog:", err));

        // Check server status
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/config/status`);
                if (response.ok) {
                    const data = await response.json();
                    setServerStatus(data);
                }
            } catch (error) {
                console.error("Error checking server status:", error);
            }
        };

        checkStatus();
        // Set up interval to check status periodically
        const intervalId = setInterval(checkStatus, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, []);

    // Combined status icon
    const StatusIcon = () => {
        const allServicesUp = serverStatus.ollama && serverStatus.whisper;

        return (
            <Tooltip
                label={
                    allServicesUp
                        ? "All services connected"
                        : `Services: ${serverStatus.ollama ? "✓" : "✗"} Ollama, ${serverStatus.whisper ? "✓" : "✗"} Whisper`
                }
                placement={isCollapsed ? "right" : "top"}
            >
                <Badge
                    colorScheme={allServicesUp ? "green" : "orange"}
                    borderRadius="full"
                    variant="subtle"
                    p={1}
                >
                    {allServicesUp ? (
                        <BsCheck2All />
                    ) : (
                        <BsExclamationTriangle />
                    )}
                </Badge>
            </Tooltip>
        );
    };

    // Display for the collapsed sidebar
    if (isCollapsed) {
        return (
            <VStack
                position="absolute"
                bottom="10px"
                left="0"
                width="100%"
                spacing={5}
                align="center"
                px={2}
            >
                <Tooltip label="View Version Info" placement="right">
                    <Box onClick={onOpen} cursor="pointer" fontSize="xl">
                        <TbVersions />
                    </Box>
                </Tooltip>

                <Tooltip label="GitHub Repository" placement="right">
                    <Link
                        href="https://github.com/bloodworks-io/phlox"
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="xl"
                    >
                        <FaGithub />
                    </Link>
                </Tooltip>

                <StatusIcon />

                <ChangelogModal
                    isOpen={isOpen}
                    onClose={onClose}
                    version={version}
                    changelog={changelog}
                />
            </VStack>
        );
    }

    // Display for the expanded sidebar
    return (
        <Box width="100%">
            <Flex align="center" justify="center" width="100%">
                <HStack spacing={4}>
                    <Text
                        fontSize="md"
                        onClick={onOpen}
                        cursor="pointer"
                        _hover={{ textDecoration: "underline" }}
                    >
                        v{version}
                    </Text>

                    <Link
                        href="https://github.com/bloodworks-io/phlox"
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="xl"
                    >
                        <FaGithub />
                    </Link>

                    <StatusIcon />
                </HStack>
            </Flex>

            <ChangelogModal
                isOpen={isOpen}
                onClose={onClose}
                version={version}
                changelog={changelog}
            />
        </Box>
    );
};

// Separate component for the changelog modal
const ChangelogModal = ({ isOpen, onClose, version, changelog }) => {
    const cleanChangelog = changelog.replace(/^# Changelog\s*\n/, "");
    const releases = cleanChangelog
        .split(/(?=## \[)/)
        .filter((release) => release.trim() !== "");

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent className="modal-style">
                <ModalHeader>Phlox - Changelog</ModalHeader>
                <ModalCloseButton />
                <ModalBody
                    maxH="70vh"
                    overflowY="auto"
                    className="custom-scrollbar"
                    px={10}
                >
                    {releases.length > 0 ? (
                        releases.map((release, index) => (
                            <Box key={index} mb={10}>
                                {" "}
                                {/* Add mb={10} here */}
                                <ReactMarkdown>{release}</ReactMarkdown>
                            </Box>
                        ))
                    ) : (
                        <Text>Loading changelog...</Text>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default VersionInfo;
