import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Textarea,
  NumberInput,
  NumberInputField,
  Button,
  useToast,
  VStack,
  HStack,
  Flex,
  IconButton,
  Collapse,
  Select,
  Input,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronDownIcon } from "@chakra-ui/icons";

const Settings = ({ customHeadings, setCustomHeadings, onSaveSettings }) => {
  const [prompts, setPrompts] = useState(null);
  const [options, setOptions] = useState({});
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPromptSettingsCollapsed, setIsPromptSettingsCollapsed] =
    useState(true);
  const [
    isClinicalHistoryPromptCollapsed,
    setIsClinicalHistoryPromptCollapsed,
  ] = useState(true);
  const [isPlanPromptCollapsed, setIsPlanPromptCollapsed] = useState(true);
  const [isRefinementPromptCollapsed, setIsRefinementPromptCollapsed] =
    useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [isSummaryPromptCollapsed, setIsSummaryPromptCollapsed] =
    useState(true);
  const [isLetterPromptCollapsed, setIsLetterPromptCollapsed] = useState(true);
  const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] =
    useState(false);
  const [isRagCollapsed, setIsRagCollapsed] = useState(true);
  const [isPromptOptionsCollapsed, setIsPromptOptionsCollapsed] =
    useState(false);
  const [isCustomHeadingsCollapsed, setIsCustomHeadingsCollapsed] =
    useState(true);
  const [modelOptions, setModelOptions] = useState([]);
  const toast = useToast();
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const resPrompts = await fetch("/api/prompts");
      if (!resPrompts.ok) throw new Error("Failed to fetch prompts");
      const dataPrompts = await resPrompts.json();
      console.log("Fetched prompts:", dataPrompts);
      setPrompts(dataPrompts);

      const resConfig = await fetch("/api/config");
      if (!resConfig.ok) throw new Error("Failed to fetch config");
      const dataConfig = await resConfig.json();
      console.log("Fetched config:", dataConfig);
      setConfig(dataConfig);

      const resOptions = await fetch("/api/options");
      if (!resOptions.ok) throw new Error("Failed to fetch options");
      const dataOptions = await resOptions.json();
      console.log("Fetched options:", dataOptions);
      setOptions(dataOptions);

      const ollamaBaseUrl = dataConfig.OLLAMA_BASE_URL;
      console.log("OLLAMA_BASE_URL:", ollamaBaseUrl);

      const apiUrl = `/api/models?ollamaEndpoint=${encodeURIComponent(ollamaBaseUrl)}`;
      console.log("API Request URL:", apiUrl);

      try {
        const resModels = await fetch(apiUrl);
        console.log("Response Status:", resModels.status);

        if (!resModels.ok) {
          console.error("Failed to fetch models:", resModels.statusText);
          throw new Error("Failed to fetch models");
        }

        const dataModels = await resModels.json();
        console.log("Fetched Models:", dataModels);

        setModelOptions(dataModels.models.map((model) => model.name));
      } catch (error) {
        console.error("Error fetching models:", error);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error loading settings",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveChanges = async () => {
    try {
      console.log("Saving prompts:", prompts);
      const resPrompts = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prompts),
      });

      if (!resPrompts.ok) throw new Error("Failed to save prompts");

      console.log("Saving config:", config);
      const resConfig = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!resConfig.ok) throw new Error("Failed to save config");

      for (const [category, categoryOptions] of Object.entries(options)) {
        const resOptions = await fetch(`/api/options/${category}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(categoryOptions),
        });

        if (!resOptions.ok)
          throw new Error(`Failed to save options for ${category}`);
      }

      const resCustomHeadings = await fetch("/api/custom-headings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customHeadings),
      });

      if (!resCustomHeadings.ok)
        throw new Error("Failed to save custom headings");

      // Update local state
      setCustomHeadings(customHeadings);

      // Call the callback to update parent state
      onSaveSettings(customHeadings);

      console.log("Changes saved successfully");
      toast({
        title: "Changes saved",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error saving changes",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      console.log("Restoring defaults");
      const resReset = await fetch("/api/reset-to-defaults", {
        method: "POST",
      });

      if (resReset.ok) {
        // Fetch all settings again after reset
        await fetchSettings();

        // Update custom headings specifically
        const resCustomHeadings = await fetch("/api/custom-headings");
        if (resCustomHeadings.ok) {
          const defaultCustomHeadings = await resCustomHeadings.json();
          setCustomHeadings(defaultCustomHeadings);
          onSaveSettings(defaultCustomHeadings);
        }

        toast({
          title: "Defaults restored",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to restore defaults");
      }
    } catch (error) {
      console.error("Error restoring defaults:", error);
      toast({
        title: "Error restoring defaults",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handlePromptChange = (promptType, field, value) => {
    setPrompts((prev) => ({
      ...prev,
      [promptType]: {
        ...prev[promptType],
        [field]: value,
      },
    }));
  };

  const handleOptionChange = (category, key, value) => {
    setOptions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: isNaN(value) ? value : Number(value),
      },
    }));
  };

  const handleStopTokenChange = (category, index, value) => {
    setOptions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        stop: prev[category].stop.map((token, i) =>
          i === index ? value : token,
        ),
      },
    }));
  };

  const handleConfigChange = (configKey, value) => {
    setConfig((prev) => ({
      ...prev,
      [configKey]: value,
    }));
  };

  if (loading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box p="5" borderRadius="md" w="100%">
      <Text fontSize="2xl" mb="4" className="headings">
        Settings
      </Text>
      <VStack spacing="5" align="stretch">
        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isModelSettingsCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() =>
                  setIsModelSettingsCollapsed(!isModelSettingsCollapsed)
                }
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Model Settings</Text>
            </Flex>
          </Flex>
          <Collapse in={!isModelSettingsCollapsed} animateOpacity>
            <Box mt="4" borderRadius="md">
              <Text fontSize="sm" mt="2">
                Whisper API Base URL
              </Text>
              <Input
                size="sm"
                value={config.WHISPER_BASE_URL}
                onChange={(e) =>
                  handleConfigChange("WHISPER_BASE_URL", e.target.value)
                }
                className="input-style"
              />
              <Text fontSize="sm" mt="2">
                Whisper Model
              </Text>
              <Input
                size="sm"
                value={config.WHISPER_MODEL}
                onChange={(e) =>
                  handleConfigChange("WHISPER_MODEL", e.target.value)
                }
                className="input-style"
              />
              <Text fontSize="sm" mt="2">
                Whisper Key
              </Text>
              <Input
                size="sm"
                value={config.WHISPER_KEY}
                onChange={(e) =>
                  handleConfigChange("WHISPER_KEY", e.target.value)
                }
                className="input-style"
              />
              <Text fontSize="sm" mt="2">
                Ollama Base URL
              </Text>
              <Input
                size="sm"
                value={config.OLLAMA_BASE_URL}
                onChange={(e) =>
                  handleConfigChange("OLLAMA_BASE_URL", e.target.value)
                }
                className="input-style"
              />
              <Text fontSize="sm" mt="2">
                Primary Model
              </Text>
              <Select
                size="sm"
                value={config.PRIMARY_MODEL}
                onChange={(e) =>
                  handleConfigChange("PRIMARY_MODEL", e.target.value)
                }
                placeholder="Select model"
                className="input-style"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
              <Text fontSize="sm" mt="2">
                Secondary Model
              </Text>
              <Select
                size="sm"
                value={config.SECONDARY_MODEL}
                onChange={(e) =>
                  handleConfigChange("SECONDARY_MODEL", e.target.value)
                }
                placeholder="Select model"
                className="input-style"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </Box>
          </Collapse>
        </Box>

        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isPromptSettingsCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() =>
                  setIsPromptSettingsCollapsed(!isPromptSettingsCollapsed)
                }
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Prompt Settings</Text>
            </Flex>
          </Flex>
          <Collapse in={!isPromptSettingsCollapsed} animateOpacity>
            <Box mt="4" borderRadius="md">
              <Box mt="4">
                <IconButton
                  icon={
                    isClinicalHistoryPromptCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsClinicalHistoryPromptCollapsed(
                      !isClinicalHistoryPromptCollapsed,
                    )
                  }
                  aria-label="Toggle Clinical History Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Encounter Detail Prompt
                </Text>
                <Collapse in={!isClinicalHistoryPromptCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    mt="4"
                    value={prompts.clinicalHistory.system}
                    onChange={(e) =>
                      handlePromptChange(
                        "clinicalHistory",
                        "system",
                        e.target.value,
                      )
                    }
                    rows={10}
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isPlanPromptCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsPlanPromptCollapsed(!isPlanPromptCollapsed)
                  }
                  aria-label="Toggle Plan Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Encounter Plan Prompt
                </Text>
                <Collapse in={!isPlanPromptCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    mt="4"
                    value={prompts.plan.system}
                    onChange={(e) =>
                      handlePromptChange("plan", "system", e.target.value)
                    }
                    rows={10}
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isRefinementPromptCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsRefinementPromptCollapsed(!isRefinementPromptCollapsed)
                  }
                  aria-label="Toggle Refinement Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Refinement Prompt
                </Text>
                <Collapse in={!isRefinementPromptCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    mt="4"
                    value={prompts.refinement.system}
                    onChange={(e) =>
                      handlePromptChange("refinement", "system", e.target.value)
                    }
                    rows={10}
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isSummaryPromptCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsSummaryPromptCollapsed(!isSummaryPromptCollapsed)
                  }
                  aria-label="Toggle Summary Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Summary Prompt
                </Text>
                <Collapse in={!isSummaryPromptCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    value={prompts.summary.system}
                    onChange={(e) =>
                      handlePromptChange("summary", "system", e.target.value)
                    }
                    rows={10}
                    mt="4"
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isChatCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />
                  }
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  aria-label="Toggle Chat Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Chat Prompt
                </Text>
                <Collapse in={!isChatCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    value={prompts.chat.system}
                    onChange={(e) =>
                      handlePromptChange("chat", "system", e.target.value)
                    }
                    rows={10}
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isLetterPromptCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsLetterPromptCollapsed(!isLetterPromptCollapsed)
                  }
                  aria-label="Toggle Letter Prompt"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Letter Prompt
                </Text>
                <Collapse in={!isLetterPromptCollapsed} animateOpacity>
                  <Textarea
                    size="sm"
                    value={prompts.letter.system}
                    onChange={(e) =>
                      handlePromptChange("letter", "system", e.target.value)
                    }
                    rows={10}
                    className="textarea-style"
                  />
                </Collapse>
              </Box>
              <Box mt="4">
                <IconButton
                  icon={
                    isPromptOptionsCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )
                  }
                  onClick={() =>
                    setIsPromptOptionsCollapsed(!isPromptOptionsCollapsed)
                  }
                  aria-label="Toggle Prompt Options"
                  variant="outline"
                  size="10"
                  mr="2"
                  className="collapse-toggle"
                />
                <Text fontSize="sm" mb="1" mt="4" display="inline">
                  Prompt Options
                </Text>
                <Collapse in={!isPromptOptionsCollapsed} animateOpacity>
                  {Object.entries(options).map(
                    ([category, categoryOptions]) => (
                      <Box key={category} mt="4">
                        <Text fontSize="md" fontWeight="bold">
                          {category.charAt(0).toUpperCase() + category.slice(1)}{" "}
                          Options
                        </Text>
                        <HStack mt="2" spacing="4" wrap="wrap">
                          {Object.entries(categoryOptions).map(
                            ([key, value]) => (
                              <Box key={key}>
                                <Text fontSize="sm">{key}</Text>
                                {key === "stop" ? (
                                  <VStack align="start">
                                    {Array.isArray(value) &&
                                      value.map((token, index) => (
                                        <Input
                                          key={index}
                                          size="sm"
                                          value={token}
                                          onChange={(e) =>
                                            handleStopTokenChange(
                                              category,
                                              index,
                                              e.target.value,
                                            )
                                          }
                                          className="input-style"
                                          width="100px"
                                        />
                                      ))}
                                  </VStack>
                                ) : typeof value === "number" ? (
                                  <NumberInput
                                    size="sm"
                                    value={value}
                                    onChange={(newValue) =>
                                      handleOptionChange(
                                        category,
                                        key,
                                        newValue,
                                      )
                                    }
                                  >
                                    <NumberInputField
                                      className="input-style"
                                      width="100px"
                                    />
                                  </NumberInput>
                                ) : (
                                  <Input
                                    size="sm"
                                    value={value}
                                    onChange={(e) =>
                                      handleOptionChange(
                                        category,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="input-style"
                                    width="100px"
                                  />
                                )}
                              </Box>
                            ),
                          )}
                        </HStack>
                      </Box>
                    ),
                  )}
                </Collapse>
              </Box>
            </Box>
          </Collapse>
        </Box>

        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isRagCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />
                }
                onClick={() => setIsRagCollapsed(!isRagCollapsed)}
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Knowledge Base (RAG) Options</Text>
            </Flex>
          </Flex>
          <Collapse in={!isRagCollapsed} animateOpacity>
            <Box mt="4" borderRadius="md">
              <Text fontSize="sm" mt="2">
                Embedding Model
              </Text>
              <Select
                size="sm"
                value={config.EMBEDDING_MODEL}
                onChange={(e) =>
                  handleConfigChange("EMBEDDING_MODEL", e.target.value)
                }
                placeholder="Select embedding model"
                className="input-style"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </Box>
          </Collapse>
        </Box>

        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isCustomHeadingsCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() =>
                  setIsCustomHeadingsCollapsed(!isCustomHeadingsCollapsed)
                }
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Custom Headings</Text>
            </Flex>
          </Flex>
          <Collapse in={!isCustomHeadingsCollapsed} animateOpacity>
            <Box mt="4" borderRadius="md">
              {Object.entries(customHeadings).map(([key, value]) => (
                <Box key={key} mt="2">
                  <Text fontSize="sm">{key}</Text>
                  <Input
                    size="sm"
                    value={value}
                    onChange={(e) =>
                      setCustomHeadings((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="input-style"
                  />
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>

        <Button mt="2" onClick={handleSaveChanges} colorScheme="blue">
          Save Changes
        </Button>
        <Button onClick={handleRestoreDefaults} colorScheme="red">
          Restore Defaults
        </Button>
      </VStack>
    </Box>
  );
};

export default Settings;
