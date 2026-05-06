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

export const YOOPTA_PLUGINS = [
  TableOfContents,
  File,
  Code.Code,
  Code.CodeGroup,
  Table,
  Accordion,
  Divider,
  Paragraph,
  HeadingOne,
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
  Image,
  Video,
  Steps,
  Carousel.extend({
    injectElementsFromPlugins: [Image],
  }),
  Tabs,
  MathInline,
  MathBlock,
];
