import { defineAsyncComponent } from "vue"
import { Code } from "lucide-vue-next"
import Bold from "./icons/Bold.vue"
import Italic from "./icons/Italic.vue"
import Strikethrough from "./icons/StrikeThrough.vue"
import Underline from "./icons/Underline.vue"
import { default as NewCommentIcon } from "../EspressoIcons/Comment.vue"
import { default as NewLink } from "../EspressoIcons/Link.vue"
import { TableCellsSplit, TableCellsMerge } from "lucide-vue-next"
import ToggleHeaderCell from "./icons/ToggleHeaderCell.vue"
import { t } from "../../i18n"

export default {
  Bold: {
    label: t("bold"),
    icon: Bold,
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  Italic: {
    label: t("italic"),
    icon: Italic,
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  Underline: {
    label: t("underline"),
    icon: Underline,
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
  },
  Strikethrough: {
    label: t("strikethrough"),
    icon: Strikethrough,
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  Code: {
    label: t("code"),
    icon: Code,
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
  },
  Link: {
    label: t("new-link"),
    icon: NewLink,
    isActive: (editor) => editor.isActive("link"),
    component: defineAsyncComponent(() =>
      import("./components/InsertLink.vue")
    ),
  },
  Separator: {
    type: "separator",
  },
  NewAnnotation: {
    label: t("new-annotation"),
    icon: NewCommentIcon,
    isActive: (editor) => editor.isActive("comment"),
    component: defineAsyncComponent(() =>
      import("./components/NewAnnotation.vue")
    ),
  },
  Comment: {
    label: t("new-comment"),
    icon: NewLink,
    isActive: (editor) => editor.isActive("comment"),
    component: defineAsyncComponent(() =>
      import("./components/NewComment.vue")
    ),
  },
  MergeCells: {
    label: t("merge-cells"),
    icon: TableCellsMerge,
    isActive: () => false,
    action: (editor) => editor.chain().focus().mergeCells().run(),
  },
  SplitCells: {
    label: t("split-cells"),
    icon: TableCellsSplit,
    isActive: () => false,
    action: (editor) => editor.chain().focus().splitCell().run(),
  },
  ToggleHeaderCell: {
    label: t("toggle-header"),
    icon: ToggleHeaderCell,
    isActive: () => false,
    action: (editor) => editor.chain().focus().toggleHeaderCell().run(),
  },
}
