<template>
  <Dialog
    v-model="open"
    :options="{ title: $t('doc-editor-add-image') }"
    @after-leave="reset"
  >
    <template #body-content>
      <FileUploader
        file-types="image/*"
        @success="(file) => (addImageDialog.url = file.file_url)"
      >
        <template #default="{ file, progress, uploading, openFileSelector }">
          <div class="flex items-center space-x-2">
            <Button @click="openFileSelector">
              {{
                uploading
                  ? $t("uploading-progress", { progress })
                  : addImageDialog.url
                  ? $t("change-image")
                  : $t("upload-image")
              }}
            </Button>
            <Button
              v-if="addImageDialog.url"
              @click="
                () => {
                  addImageDialog.url = null
                  addImageDialog.file = null
                }
              "
            >
              {{ $t("remove") }}
            </Button>
          </div>
        </template>
      </FileUploader>
      <img
        v-if="addImageDialog.url"
        :src="addImageDialog.url"
        class="mt-2 w-full rounded-lg space-x-2"
      />
    </template>
    <template #actions>
      <Button
        class="mr-2"
        variant="solid"
        @click="addImage(addImageDialog.url)"
      >
        {{ $t("doc-editor-insert-image") }}
      </Button>
      <Button @click="reset">{{ $t("cancel") }}</Button>
    </template>
  </Dialog>
</template>
<script>
import { Button, Dialog, FileUploader } from "frappe-ui"

export default {
  name: "InsertImage",
  components: { Button, Dialog, FileUploader },
  props: {
    modelValue: {
      type: Boolean,
      required: false,
    },
    editor: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      addImageDialog: { url: "", file: null },
    }
  },
  computed: {
    open: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit("update:modelValue", value)
        if (!value) {
          this.errorMessage = ""
        }
      },
    },
  },
  methods: {
    onImageSelect(e) {
      let file = e.target.files[0]
      if (!file) {
        return
      }
      this.addImageDialog.file = file
    },

    addImage(src) {
      this.editor
        .chain()
        .focus()
        .setMedia({
          src: src,
          "media-type": "img",
          width: "100%",
          height: "auto",
        })
        .run()
      this.reset()
    },
    reset() {
      this.open = false
    },
  },
}
</script>
