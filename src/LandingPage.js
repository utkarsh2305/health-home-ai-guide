import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Input,
  Link,
  Button,
  IconButton,
  useColorMode,
  useToast,
  Checkbox,
  Grid,
  GridItem,
  Collapse,
} from "@chakra-ui/react";
import {
  AddIcon,
  DeleteIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import axios from "axios";

const LandingPage = () => {
  const [feeds, setFeeds] = useState([]);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [rssItems, setRssItems] = useState([]);
  const [incompleteJobs, setIncompleteJobs] = useState(0);
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [rssDigests, setRssDigests] = useState([]);
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRssFeedsCollapsed, setIsRssFeedsCollapsed] = useState(true);
  const [isRssDigestsCollapsed, setIsRssDigestsCollapsed] = useState(false);

  const fetchRssDigests = async () => {
    try {
      const response = await axios.get("/api/rss/digest");
      setRssDigests(response.data.digests);
    } catch (error) {
      console.error("Error fetching RSS digests:", error);
      toast({
        title: "Error fetching RSS digests",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchFeeds = async () => {
    try {
      const response = await axios.get("/api/rss/list");
      setFeeds(response.data.feeds);
    } catch (error) {
      console.error("Error fetching feeds:", error);
      toast({
        title: "Error fetching feeds",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const refreshAllFeeds = async () => {
    setIsRefreshing(true);
    try {
      await axios.post("/api/rss/refresh", {});
      await fetchFeeds();
      await fetchRssItems();
      await fetchRssDigests();
      toast({
        title: "All feeds refreshed successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error refreshing all feeds:", error);
      toast({
        title: "Error refreshing all feeds",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshSingleFeed = async (feedId) => {
    setIsRefreshing(true);
    try {
      await axios.post("/api/rss/refresh", { feed_id: feedId });
      await fetchFeeds();
      await fetchRssItems();
      await fetchRssDigests();
      toast({
        title: "Feed refreshed successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error refreshing feed:", error);
      toast({
        title: "Error refreshing feed",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  const fetchIncompleteJobs = async () => {
    try {
      const response = await axios.get("/api/incomplete-jobs-count");
      setIncompleteJobs(response.data.incomplete_jobs_count);
    } catch (error) {
      console.error("Error fetching incomplete tasks count:", error);
      toast({
        title: "Error fetching tasks",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const addTodo = async () => {
    if (newTodo.trim()) {
      try {
        const response = await axios.post("/api/todos", { task: newTodo });
        setTodos([...todos, response.data.todo]);
        setNewTodo("");
        fetchIncompleteJobs();
      } catch (error) {
        console.error("Error adding todo:", error);
        toast({
          title: "Error adding todo",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      const todoToUpdate = todos.find((todo) => todo.id === id);
      const response = await axios.put(`/api/todos/${id}`, {
        ...todoToUpdate,
        completed: !completed,
      });
      setTodos(
        todos.map((todo) => (todo.id === id ? response.data.todo : todo)),
      );
      fetchIncompleteJobs();
    } catch (error) {
      console.error("Error updating todo:", error);
      toast({
        title: "Error updating todo",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`/api/todos/${id}`);
      setTodos(todos.filter((todo) => todo.id !== id));
      fetchIncompleteJobs();
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast({
        title: "Error deleting todo",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const addFeed = async () => {
    if (newFeedUrl) {
      try {
        await axios.post("/api/rss/add", { url: newFeedUrl });
        setNewFeedUrl("");
        fetchFeeds();
        toast({
          title: "Feed added successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error adding feed:", error);
        toast({
          title: "Error adding feed",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const removeFeed = async (feedId) => {
    try {
      await axios.delete(`/api/rss/remove/${feedId}`);
      fetchFeeds();
      toast({
        title: "Feed removed successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error removing feed:", error);
      toast({
        title: "Error removing feed",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchRssItems = useCallback(async () => {
    try {
      const response = await axios.post("/api/rss/fetch", { feeds });
      setRssItems(response.data.items);
    } catch (error) {
      console.error("Error fetching RSS items:", error);
      setRssItems([]);
    }
  }, [feeds]);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsRefreshing(true);
      try {
        const [feedsResponse, jobsResponse, todosResponse, digestsResponse] =
          await Promise.all([
            axios.get("/api/rss/list"),
            axios.get("/api/incomplete-jobs-count"),
            axios.get("/api/todos"),
            axios.get("/api/rss/digest"),
          ]);

        setFeeds(feedsResponse.data.feeds);
        setIncompleteJobs(jobsResponse.data.incomplete_jobs_count);
        setTodos(todosResponse.data.todos);
        setRssDigests(digestsResponse.data.digests);

        // Fetch RSS items only if there are feeds
        if (feedsResponse.data.feeds.length > 0) {
          const rssItemsResponse = await axios.post("/api/rss/fetch", {
            feeds: feedsResponse.data.feeds,
          });
          setRssItems(rssItemsResponse.data.items);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error fetching data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchAllData();
  }, []);

  return (
    <Box p="5" borderRadius="md" w="100%">
      <Text fontSize="2xl" mb="4" className="headings" textAlign="center">
        Dashboard
      </Text>

      <VStack spacing={8} align="stretch">
        <Flex direction={{ base: "column", md: "row" }} gap={6}>
          {/* Todo List Panel */}
          <Box flex="1" className="panels-bg" p="4" borderRadius="md">
            <Text textAlign="center" mb="5">
              Todo List
            </Text>
            <VStack align="stretch" spacing={4}>
              <HStack>
                <Input
                  placeholder="Add a new todo"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  className="input-style"
                />
                <Button
                  leftIcon={<AddIcon />}
                  onClick={addTodo}
                  className="switch-mode"
                >
                  Add
                </Button>
              </HStack>
              <VStack
                align="stretch"
                spacing={2}
                maxHeight="300px"
                overflowY="auto"
                className="summary-panels"
              >
                {todos.map((todo) => (
                  <HStack
                    key={todo.id}
                    justify="space-between"
                    p={2}
                    borderWidth={1}
                    borderRadius="md"
                  >
                    <Checkbox
                      isChecked={todo.completed}
                      onChange={() => toggleTodo(todo.id, todo.completed)}
                      size="lg"
                      className="checkbox task-checkbox"
                    >
                      <Text as={todo.completed ? "s" : "span"}>
                        {todo.task}
                      </Text>
                    </Checkbox>
                    <IconButton
                      icon={<DeleteIcon />}
                      onClick={() => deleteTodo(todo.id)}
                      aria-label="Delete todo"
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                    />
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>

          {/* Incomplete Jobs Panel */}
          <Box flex="1" className="panels-bg" p="4" borderRadius="md">
            <Text textAlign="center">Incomplete Clinic Jobs</Text>
            <Flex
              direction="column"
              align="center"
              justify="center"
              height="100%"
            >
              <Text
                fontSize="6xl"
                fontWeight="bold"
                color={colorMode === "dark" ? "teal.200" : "teal.500"}
              >
                {incompleteJobs}
              </Text>
            </Flex>
          </Box>
        </Flex>
        {/* RSS Digest Panel */}
        <Box className="panels-bg" p="4" borderRadius="md">
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isRssDigestsCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() => setIsRssDigestsCollapsed(!isRssDigestsCollapsed)}
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>News Digest</Text>
            </Flex>
          </Flex>
          <Collapse in={!isRssDigestsCollapsed} animateOpacity>
            <VStack align="stretch" spacing={4}>
              {rssDigests.map((digest, index) => (
                <Box
                  key={index}
                  p={4}
                  borderWidth={1}
                  borderRadius="md"
                  className="summary-panels"
                >
                  <Text fontWeight="bold">{digest.title}</Text>
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    From: {digest.feed_title}
                  </Text>
                  <Text>{digest.digest}</Text>
                  <Link href={digest.link} isExternal color="blue.500">
                    Read full article <ExternalLinkIcon mx="2px" />
                  </Link>
                </Box>
              ))}
            </VStack>
          </Collapse>
        </Box>
        {/* RSS Feed Panel */}
        <Box className="panels-bg" p="4" borderRadius="md">
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isRssFeedsCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() => setIsRssFeedsCollapsed(!isRssFeedsCollapsed)}
                aria-label="Toggle collapse"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>RSS Feeds</Text>
            </Flex>
            <IconButton
              icon={<RepeatIcon />}
              onClick={refreshAllFeeds}
              aria-label="Refresh all feeds"
              size="sm"
              colorScheme="blue"
              variant="outline"
              isLoading={isRefreshing}
            />
          </Flex>
          <Collapse in={!isRssFeedsCollapsed} animateOpacity>
            <VStack align="stretch" spacing={4} mt="2">
              <HStack>
                <Input
                  placeholder="Enter RSS feed URL"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="input-style"
                />
                <Button
                  leftIcon={<AddIcon />}
                  onClick={addFeed}
                  className="switch-mode"
                >
                  Add Feed
                </Button>
              </HStack>
              <Grid
                templateColumns="repeat(auto-fill, minmax(250px, 1fr))"
                gap={4}
              >
                {feeds.map((feed) => (
                  <GridItem key={feed.id}>
                    <HStack
                      justify="space-between"
                      p={2}
                      borderWidth={1}
                      borderRadius="md"
                    >
                      <Text isTruncated>{feed.title || feed.url}</Text>
                      <HStack>
                        <IconButton
                          icon={<RepeatIcon />}
                          onClick={() => refreshSingleFeed(feed.id)}
                          aria-label="Refresh feed"
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          onClick={() => removeFeed(feed.id)}
                          aria-label="Remove feed"
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                        />
                      </HStack>
                    </HStack>
                  </GridItem>
                ))}
              </Grid>
              <Box
                mt={6}
                maxHeight="400px"
                overflowY="auto"
                borderWidth={1}
                borderRadius="md"
                p={4}
                className="summary-panels"
              >
                <Text fontSize="xl" mb={3} fontWeight="semibold">
                  Latest RSS Items
                </Text>
                <VStack align="stretch" spacing={4}>
                  {rssItems.map((item, index) => (
                    <Box
                      key={index}
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      _hover={{ boxShadow: "md" }}
                    >
                      <Text fontWeight="bold">{item.title}</Text>
                      <Text fontSize="sm" mt={1} noOfLines={2}>
                        {item.description}
                      </Text>
                      <Button
                        as="a"
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        mt={2}
                        colorScheme="blue"
                        variant="outline"
                      >
                        Read more
                      </Button>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </Collapse>
        </Box>
      </VStack>
    </Box>
  );
};

export default LandingPage;
