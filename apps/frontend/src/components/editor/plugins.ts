import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Code from "@yoopta/code";
import Table from "@yoopta/table";
import Accordion from "@yoopta/accordion";
import Divider from "@yoopta/divider";
import Paragraph from "@yoopta/paragraph";
import Blockquote from "@yoopta/blockquote";
import Callout from "@yoopta/callout";
import Link from "@yoopta/link";
import { NumberedList, BulletedList, TodoList } from "@yoopta/lists";
import Embed from "@yoopta/embed";
import Image from "@yoopta/image";
import Video from "@yoopta/video";
import Emoji from "@yoopta/emoji";
import File from "@yoopta/file";
import Tabs from "@yoopta/tabs";
import Steps from "@yoopta/steps";
import Carousel from "@yoopta/carousel";
import { MathInline, MathBlock } from "@yoopta/math";
import TableOfContents from "@yoopta/table-of-contents";
import { filesServiceCreateFile } from "../../api/files/files";

import "katex/dist/katex.min.css";

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for dimensions"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      reject(new Error("Failed to load video for dimensions"));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
};
const uploadToS3 = async (file: File, width?: number, height?: number) => {
  const res = await filesServiceCreateFile({
    size_bytes: file.size,
    mime_type: file.type,
    width: width ?? null,
    height: height ?? null,
  });

  if (res.status !== 201) {
    throw new Error("Failed to create file record");
  }
  const { url, id } = res.data;

  const uploadRes = await fetch(url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload file to S3");
  }

  return {
    id,
    src: `/api/files/${id}/content`,
  };
};

const YImage = Image.extend({
  options: {
    upload: async (file) => {
      const { width, height } = await getImageDimensions(file);
      const { id, src } = await uploadToS3(file, width, height);

      return {
        id,
        src,
        alt: file.name,
        fit: "cover",
        sizes: {
          width,
          height,
        },
      };
    },
  },
});

export const YOOPTA_PLUGINS = [
  TableOfContents,
  File.extend({
    options: {
      upload: async (file) => {
        const { id, src } = await uploadToS3(file);
        return {
          id,
          src,
          name: file.name,
          size: file.size,
          format: file.name.split(".").pop(),
        };
      },
    },
  }),
  Code.Code,
  Code.CodeGroup,
  Table,
  Accordion,
  Divider,
  Paragraph,
  HeadingOne.extend({
    elements: {
      "heading-one": {
        placeholder: "Heading 1",
      },
    },
  }),
  HeadingTwo,
  HeadingThree,
  Blockquote,
  Callout,
  Link,
  NumberedList,
  BulletedList,
  TodoList,
  Embed,
  Emoji,
  YImage,
  Video.extend({
    options: {
      upload: async (file) => {
        const { width, height } = await getVideoDimensions(file);
        const { id, src } = await uploadToS3(file, width, height);

        return {
          id,
          src,
          name: file.name,
          size: file.size,
          format: file.name.split(".").pop(),
          sizes: {
            width,
            height,
          },
        };
      },
    },
  }),
  Steps.extend({
    elements: {
      "step-list-item-heading": {
        placeholder: "Step title",
      },
      "step-list-item-content": {
        placeholder: "Describe this step...",
      },
    },
  }),
  Carousel.extend({
    injectElementsFromPlugins: [YImage],
  }),
  Tabs,
  MathInline,
  MathBlock,
];
