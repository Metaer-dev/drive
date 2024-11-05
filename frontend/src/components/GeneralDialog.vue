<template>
  <Dialog v-model="open" :options="{ title: dialogData.title, size: 'sm' }">
    <template #body-content>
      <div class="flex items-center justify-start">
        <p class="text-base text-gray-600 leading-5">
          {{ dialogData.message }}
        </p>
      </div>
      <ErrorMessage class="my-1" :message="errorMessage" />
      <div class="flex mt-5">
        <Button
          :variant="dialogData.variant"
          :icon-left="dialogData.buttonIcon"
          :theme="dialogData.theme"
          class="w-full"
          :loading="$resources.method.loading"
          @click="$resources.method.submit()"
        >
          {{ dialogData.buttonMessage }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
<script>
import { Dialog, ErrorMessage } from "frappe-ui"
import { del } from "idb-keyval"
import { toast } from "../utils/toasts.js"

export default {
  name: "GeneralDialog",

  components: {
    Dialog,
    ErrorMessage,
  },

  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    entities: {
      type: [Array, String],
      required: true,
    },
    for: {
      type: String,
      default: null,
    },
  },
  emits: ["update:modelValue", "success"],
  data() {
    return {
      errorMessage: "",
    }
  },

  computed: {
    dialogData() {
      // const items =
      //   this.entities.length === 1
      //     ? `${this.entities.length} item`
      //     : `${this.entities.length} items`
      const items =
        this.entities.length === 1
          ? this.$t("singleItem", { count: this.entities.length })
          : this.$t("multipleItems", { count: this.entities.length })

      switch (this.for) {
        case "unshare":
          return {
            title: this.$t("unshare-dialog"),
            message: this.$t(
              "selected-items-will-not-be-shared-with-you-anymore-and-you-will-lose-access-to-them"
            ),
            buttonMessage: this.$t("remove-unshare-dialog"),
            theme: "red",
            buttonIcon: "trash-2",
            methodName: "drive.api.files.unshare_entities",
            toastMessage: this.$t("unshared-toast", { items }),
          }
        case "restore":
          return {
            title: this.$t("restore"),
            message: this.$t(
              "selected-items-will-be-restored-to-their-original-locations"
            ),
            buttonMessage: this.$t("restore"),
            variant: "solid",
            buttonIcon: "refresh-ccw",
            methodName: "drive.api.files.remove_or_restore",
            toastMessage: this.$t("restored-toast", { items }),
          }
        case "remove":
          return {
            title: this.$t("move-to-trash"),
            message:
              items +
              this.$t(
                "will-be-moved-to-trash-items-in-trash-are-deleted-forever-after-30-days-other-users-will-lose-access-to-this"
              ),
            buttonMessage: this.$t("move-to-trash-dialog"),
            theme: "red",
            variant: "subtle",
            buttonIcon: "trash-2",
            methodName: "drive.api.files.remove_or_restore",
            toastMessage: this.$t("moved-to-trash-toast", { items }),
          }
        default:
          return {}
      }
    },
    open: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit("update:modelValue", value)
      },
    },
  },

  resources: {
    method() {
      return {
        url: this.dialogData.methodName,
        params: {
          entity_names:
            typeof this.entities === "string"
              ? JSON.stringify([this.entities])
              : JSON.stringify(this.entities.map((entity) => entity.name)),
        },
        onSuccess(data) {
          this.$emit("success", data)
          this.$resources.method.reset()
          this.entities.map((entity) => del(entity.name))
          toast({
            title: this.dialogData.toastMessage,
            position: "bottom-right",
            timeout: 2,
          })
        },
        onError(error) {
          if (error.messages) {
            this.errorMessage = error.messages.join("\n")
          } else {
            this.errorMessage = error.message
          }
        },
      }
    },
  },
}
</script>
