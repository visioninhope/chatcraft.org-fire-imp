import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  useDisclosure,
  Grid,
  GridItem,
  Heading,
  Card,
  CardBody,
  Text,
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem,
  MenuDivider,
  CardFooter,
  useToast,
} from "@chakra-ui/react";
import { LuFunctionSquare } from "react-icons/lu";
import { useFetcher, useLoaderData } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useSettings } from "../hooks/use-settings";
import { ChatCraftFunction } from "../lib/ChatCraftFunction";
import FunctionEditor from "./FunctionEditor";
import { TbDots } from "react-icons/tb";
import { download, formatDate } from "../lib/utils";
import { useLiveQuery } from "dexie-react-hooks";

export default function Function() {
  const [, copyToClipboard] = useCopyToClipboard();
  const toast = useToast();
  const fetcher = useFetcher();

  const funcId = useLoaderData() as string;
  const { settings, setSettings } = useSettings();
  const { isOpen: isSidebarVisible, onToggle: toggleSidebarVisible } = useDisclosure({
    defaultIsOpen: settings.sidebarVisible,
  });
  const inputPromptRef = useRef<HTMLTextAreaElement>(null);

  const func = useLiveQuery<ChatCraftFunction | undefined>(() => {
    if (funcId) {
      return Promise.resolve(ChatCraftFunction.find(funcId));
    }
  }, [funcId]);

  const title = useMemo(() => {
    if (!func) {
      return "";
    }
    return `${func?.name}() - ${func.description}`;
  }, [func]);

  const filename = useMemo(() => {
    if (!func) {
      return "code.js";
    }
    return `${func.name}.js`;
  }, [func]);

  const handleCodeChange = async (value: string) => {
    if (!func) {
      return;
    }

    try {
      func.code = value;
      await func.save();
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleSidebarVisible = useCallback(() => {
    const newValue = !isSidebarVisible;
    toggleSidebarVisible();
    setSettings({ ...settings, sidebarVisible: newValue });
  }, [isSidebarVisible, settings, setSettings, toggleSidebarVisible]);

  if (!func) {
    return null;
  }

  const handleCopyFunctionClick = () => {
    const text = func.code;
    copyToClipboard(text);
    toast({
      colorScheme: "blue",
      title: "Function copied to clipboard",
      status: "success",
      position: "top",
      isClosable: true,
    });
  };

  const handleDownloadFunctionClick = () => {
    const text = func.code;
    download(text, filename, "text/javascript");
    toast({
      colorScheme: "blue",
      title: "Function downloaded",
      status: "success",
      position: "top",
      isClosable: true,
    });
  };

  const handleDeleteFunctionClick = () => {
    fetcher.submit({}, { method: "post", action: `/f/${func.id}/delete` });
  };

  return (
    <Grid
      w="100%"
      h="100%"
      gridTemplateRows="min-content 1fr min-content"
      gridTemplateColumns={{
        base: isSidebarVisible ? "300px 1fr" : "0 1fr",
        sm: isSidebarVisible ? "300px 1fr" : "0 1fr",
        md: isSidebarVisible ? "minmax(300px, 1fr) 4fr" : "0: 1fr",
      }}
      bgGradient="linear(to-b, white, gray.100)"
      _dark={{ bgGradient: "linear(to-b, gray.600, gray.700)" }}
    >
      <GridItem colSpan={2}>
        <Header inputPromptRef={inputPromptRef} onToggleSidebar={handleToggleSidebarVisible} />
      </GridItem>

      <GridItem rowSpan={3} overflowY="auto">
        <Sidebar />
      </GridItem>

      <GridItem overflowY="auto" pos="relative">
        <Flex direction="column" h="100%" maxH="100%" maxW="900px" mx="auto" px={1} gap={4}>
          <>
            <Card
              variant="filled"
              bg="gray.200"
              size="sm"
              border="1px solid"
              borderColor="gray.300"
              _dark={{
                bg: "gray.800",
                borderColor: "gray.900",
              }}
              mt={2}
            >
              <CardBody pb={0}>
                <Heading as="h2" fontSize="lg">
                  <Flex align="center" justifyContent="space-between">
                    <Flex align="center" gap={2}>
                      <LuFunctionSquare />
                      <Text fontSize="md" fontWeight="bold" noOfLines={1}>
                        {title}
                      </Text>
                    </Flex>

                    <Menu>
                      <MenuButton
                        as={IconButton}
                        aria-label="Chat Menu"
                        icon={<TbDots />}
                        variant="ghost"
                      />
                      <MenuList>
                        <MenuItem onClick={() => handleCopyFunctionClick()}>Copy</MenuItem>
                        <MenuItem onClick={() => handleDownloadFunctionClick()}>Download</MenuItem>

                        <MenuDivider />
                        <MenuItem color="red.400" onClick={() => handleDeleteFunctionClick()}>
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                </Heading>
              </CardBody>
              <CardFooter pt={0} color="gray.500" _dark={{ color: "gray.400" }}>
                <Text fontSize="sm" ml={6}>
                  {formatDate(new Date())}
                </Text>
              </CardFooter>
            </Card>

            <Box flex={1} mb={4}>
              <Card>
                <CardBody>
                  <FunctionEditor
                    value={func.code}
                    onChange={handleCodeChange}
                    filename={filename}
                  />
                </CardBody>
              </Card>
            </Box>
          </>
        </Flex>
      </GridItem>
    </Grid>
  );
}
