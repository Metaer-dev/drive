<template>
  <nav
    ondragstart="return false;"
    ondrop="return false;"
    class="bg-white top-0 border-b min-w-full"
  >
    <div
      class="mx-auto pl-4 py-2.5 pr-2 h-12 z-10 flex items-center justify-between"
    >
      <Breadcrumbs />
      <div class="flex gap-1">
        <div
          v-if="connectedUsers.length > 1 && isLoggedIn"
          class="hidden sm:flex bg-gray-200 rounded justify-center items-center px-1"
        >
          <UsersBar />
        </div>
        <Dropdown
          v-if="$store.state.entityInfo"
          :options="actionItems"
          placement="right"
          class="lg:basis-auto"
        >
          <Button
            v-if="
              $route.meta.documentPage ||
              $route.name === 'File' ||
              $route.name === 'Folder'
            "
            variant="ghost"
            @click="handleSelectedEntity"
          >
            <FeatherIcon class="h-4" name="more-horizontal" />
          </Button>
        </Dropdown>
        <div v-if="isLoggedIn" class="block sm:flex">
          <Button
            v-if="$route.name === 'Document' || $route.name === 'File'"
            :variant="'solid'"
            :disabled="
              $store.state.entityInfo[0]?.owner !== 'You' ||
              $store.state.elementExists
            "
            class="bg-gray-200 rounded flex justify-center items-center px-1"
            @click="emitter.emit('showShareDialog')"
          >
            <template #prefix>
              <Share class="w-4" />
            </template>
            {{ $t("share") }}
          </Button>
          <Button
            v-else-if="$route.name === 'Recents'"
            class="line-clamp-1 truncate w-full"
            :disabled="
              !currentViewEntites?.length || $store.state.elementExists
            "
            theme="red"
            :variant="'subtle'"
            @click="emitter.emit('showCTADelete')"
          >
            <template #prefix>
              <FeatherIcon name="trash-2" class="w-4" />
            </template>
            {{ $t("clear-recents") }}
          </Button>
          <Button
            v-else-if="$route.name === 'Favourites'"
            class="line-clamp-1 truncate"
            :disabled="
              !currentViewEntites?.length || $store.state.elementExists
            "
            theme="red"
            :variant="'subtle'"
            @click="emitter.emit('showCTADelete')"
          >
            <template #prefix>
              <FeatherIcon name="trash-2" class="w-4" />
            </template>
            {{ $t("clear-favourites") }}
          </Button>
          <Button
            v-else-if="$route.name === 'Trash'"
            class="line-clamp-1 truncate"
            :disabled="
              !currentViewEntites?.length || $store.state.elementExists
            "
            theme="red"
            :variant="'subtle'"
            @click="emitter.emit('showCTADelete')"
          >
            <template #prefix>
              <FeatherIcon name="trash-2" class="w-4" />
            </template>
            {{ $t("empty-trash") }}
          </Button>

          <Dropdown
            v-else
            :options="newEntityOptions"
            placement="left"
            class="lg:basis-auto"
          >
            <Button
              variant="solid"
              :disabled="canUpload || $store.state.elementExists"
            >
              <template #prefix>
                <FeatherIcon name="upload" class="w-4" />
              </template>
              {{ $t("new") }}
              <template #suffix>
                <FeatherIcon name="chevron-down" class="w-4" />
              </template>
            </Button>
          </Dropdown>
        </div>
        <div
          v-if="!isLoggedIn && $store.state.user.fullName === 'Guest'"
          class="ml-auto"
        >
          <Button variant="solid" @click="$router.push({ name: 'Login' })">
            {{ $t("sign-in") }}
          </Button>
        </div>
      </div>
    </div>
  </nav>
  <Dialog
    v-if="showUpdateDialog"
    v-model="showUpdateDialog"
    :options="{
      title: 'Warning! ',
      icon: 'alert-octagon',
      message:
        'You are about to upload file and update doctype. Records in the doctype will be updated with records having the same ID from the uploaded file. Please confirm to proceed.',
      size: 'sm',
      actions: [
        {
          label: 'Confirm',
          variant: 'solid',
          theme: 'red',
          onClick: () => {
            emitter.emit('uploadFile', { update: true })
            showUpdateDialog = false
          },
        },
      ],
    }"
  />
  <Dialog
    v-if="showInsertDialog"
    v-model="showInsertDialog"
    :options="{
      title: 'Notice! ',
      icon: 'alert-octagon',
      message:
        ' You are about to upload file and insert records into doctype. The content of the file will be inserted as new records at the end of the doctype. Please confirm to proceed.',
      size: 'sm',
      actions: [
        {
          label: 'Confirm',
          variant: 'subtle',
          theme: 'red',
          onClick: () => {
            emitter.emit('uploadFile', { insert: true })
            showInsertDialog = false
          },
        },
      ],
    }"
  />
  <Dialog
    v-if="showCoverDialog"
    v-model="showCoverDialog"
    :options="{
      title: 'Warning! ',
      message:
        'You are about to upload file and overwrite doctype. All existing records in the doctype will be deleted and replaced with records from the uploaded file. Please confirm to proceed.',
      size: 'sm',
      actions: [
        {
          label: 'Confirm',
          variant: 'solid',
          theme: 'red',
          onClick: () => {
            emitter.emit('uploadFile', { cover: true })
            showCoverDialog = false
          },
        },
      ],
    }"
  />
  <NewFolderDialog
    v-model="showNewFolderDialog"
    :parent="$route.params.entityName"
    @success="
      () => {
        emitter.emit('fetchFolderContents')
        showNewFolderDialog = false
      }
    "
  />
  <RenameDialog
    v-if="showRenameDialog"
    v-model="showRenameDialog"
    :parent="$route.params.entityName"
    :entity="selectedEntities[0] ? selectedEntities[0] : currentFolder[0]"
    @success="
      () => {
        showRenameDialog = false
      }
    "
  />
</template>
<script>
import { markRaw } from "vue"
import UsersBar from "./UsersBar.vue"
import { Dropdown, FeatherIcon, Button, Dialog } from "frappe-ui"
import NewFolderDialog from "@/components/NewFolderDialog.vue"
import RenameDialog from "@/components/RenameDialog.vue"
import Breadcrumbs from "@/components/Breadcrumbs.vue"
import { formatDate } from "@/utils/format"
import { getLink } from "@/utils/getLink"
import {
  folderDownload,
  selectedEntitiesDownload,
} from "@/utils/folderDownload"
import Printer from "./EspressoIcons/Printer.vue"
import Share from "./EspressoIcons/Share.vue"
import Star from "./EspressoIcons/Star.vue"
import Rename from "./EspressoIcons/Rename.vue"
import Link from "./EspressoIcons/Link.vue"
import Download from "./EspressoIcons/Download.vue"
import NewFolder from "./EspressoIcons/NewFolder.vue"
import FileUpload from "./EspressoIcons/File-upload.vue"
import FolderUpload from "./EspressoIcons/Folder-upload.vue"
import NewFile from "./EspressoIcons/NewFile.vue"
import { capture } from "@/telemetry"

const FileUploadIcon = markRaw(FileUpload)
const FolderUploadIcon = markRaw(FolderUpload)
const NewFolderIcon = markRaw(NewFolder)
const NewFileIcon = markRaw(NewFile)

export default {
  name: "Navbar",
  components: {
    Dialog,
    RenameDialog,
    NewFolderDialog,
    Dropdown,
    FeatherIcon,
    Button,
    Breadcrumbs,
    UsersBar,
    Share,
  },
  props: {
    breadcrumbs: {
      type: Array,
      default: null,
    },
    mobileSidebarIsOpen: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["toggleMobileSidebar", "fetchRecents"],
  data() {
    return {
      previewEntity: null,
      showPreview: false,
      showNewFolderDialog: false,
      showRenameDialog: false,
      showUpdateDialog: false,
      showInsertDialog: false,
      showCoverDialog: false,
      newEntityOptions: [
        {
          group: this.$t("new-doctype"),
          items: [
            {
              label: this.$t("insert"),
              icon: FileUploadIcon,
              onClick: () => (this.showInsertDialog = true),
            },
            {
              label: this.$t("update"),
              icon: FileUploadIcon,
              onClick: () => (this.showUpdateDialog = true),
            },
            {
              label: this.$t("cover"),
              icon: FileUploadIcon,
              onClick: () => (this.showCoverDialog = true),
            },
          ],
        },
        {
          group: this.$t("upload"),
          items: [
            {
              label: this.$t("validate-file"),
              icon: FileUploadIcon,
              onClick: () =>
                this.emitter.emit("uploadFile", { validate: true }),
            },
            {
              label: this.$t("upload-file"),
              icon: FileUploadIcon,
              onClick: () => this.emitter.emit("uploadFile"),
            },
            {
              label: this.$t("upload-folder"),
              icon: FolderUploadIcon,
              onClick: () => this.emitter.emit("uploadFolder"),
              isEnabled: () => this.selectedEntities.length === 0,
            },
          ],
        },
        {
          group: this.$t("new-file"),
          items: [
            {
              label: this.$t("new-folder"),
              icon: NewFolderIcon,
              onClick: () => (this.showNewFolderDialog = true),
            },
            {
              label: this.$t("new-document"),
              icon: NewFileIcon,
              onClick: async () => {
                await this.$resources.createDocument.submit({
                  title: this.$t("untitled-document"),
                  content: null,
                  parent: this.$store.state.currentFolderID,
                })
                capture("new_document_created")
                if (this.$store.state.editorNewTab) {
                  window.open(
                    this.$router.resolve({
                      name: "Document",
                      params: { entityName: this.previewEntity.name },
                    }).href,
                    "_blank"
                  )
                } else {
                  this.$router.push({
                    name: "Document",
                    params: { entityName: this.previewEntity.name },
                  })
                }
              },

              isEnabled: () => this.selectedEntities?.length === 0,
            },
          ],
        },
      ],
    }
  },
  computed: {
    isButtonDisabled() {
      if (document.getElementById("headlessui-portal-root")) {
        console.log("TRUE")
        return true
      }
      console.log(document.getElementById("headlessui-portal-root"))
      return false
    },
    selectedEntities() {
      if (this.$route.name === "Folder") {
        return this.$store.state.currentFolder
      }
      return this.$store.state.entityInfo
    },
    actionItems() {
      return [
        {
          label: this.$t("download"),
          icon: Download,
          onClick: () => {
            window.location.href = `/api/method/drive.api.files.get_file_content?entity_name=${this.selectedEntities[0].name}&trigger_download=1`
          },
          isEnabled: () => {
            if (this.selectedEntities?.length === 1) {
              if (
                this.selectedEntities?.length === 1 &&
                !this.selectedEntities[0]?.is_group &&
                !this.selectedEntities[0]?.document
              ) {
                return (
                  this.selectedEntities[0]?.allow_download ||
                  this.selectedEntities[0]?.owner === "You"
                )
              }
            }
          },
        },
        {
          label: this.$t("print"),
          icon: Printer,
          onClick: () => {
            this.emitter.emit("printFile")
          },
          isEnabled: () => {
            const validRoutes = ["File", "Document"]
            const validFileKinds = ["Document", "Image", "PDF"]
            if (
              validRoutes.includes(this.$route.name) &&
              this.selectedEntities[0]?.allow_download &&
              validFileKinds.includes(this.selectedEntities[0]?.file_kind)
            ) {
              return true
            }
          },
        },
        {
          label: this.$t("download"),
          icon: Download,
          onClick: () => {
            if (this.selectedEntities.length > 1) {
              let selected_entities = this.selectedEntities
              selectedEntitiesDownload(selected_entities)
            } else if (this.selectedEntities[0].is_group === 1) {
              folderDownload(this.selectedEntities[0])
            }
          },
          isEnabled: () => {
            if (
              this.selectedEntities?.length === 1 &&
              !this.selectedEntities[0]?.is_group
            ) {
              return false
            }
            if (this.selectedEntities?.length) {
              const allEntitiesSatisfyCondition = this.selectedEntities?.every(
                (entity) => {
                  return entity.allow_download || entity.owner === "You"
                }
              )
              return allEntitiesSatisfyCondition
            }
          },
        },
        {
          label: this.$t("share"),
          icon: Share,
          onClick: () => {
            this.emitter.emit("showShareDialog")
          },
          isEnabled: () => {
            return (
              this.$route.name === "Folder" &&
              this.$store.state.currentFolder[0]?.owner === "You"
            )
          },
        },
        {
          label: this.$t("get-link"),
          icon: Link,
          onClick: () => {
            getLink(this.selectedEntities[0])
          },
          isEnabled: () => {
            return this.selectedEntities?.length === 1
          },
        },
        {
          label: this.$t("rename"),
          icon: Rename,
          onClick: () => {
            this.showRenameDialog = true
          },
          isEnabled: () => {
            return (
              this.selectedEntities?.length === 1 &&
              (this.selectedEntities[0]?.write ||
                this.selectedEntities[0]?.owner === "You")
            )
          },
        },
        {
          label: this.$t("favourite"),
          icon: Star,
          onClick: () => {
            this.$resources.toggleFavourite.submit()
          },
          isEnabled: () => {
            return (
              this.selectedEntities?.length > 0 &&
              this.isLoggedIn &&
              this.selectedEntities?.every((x) => !x.is_favourite)
            )
          },
        },
        {
          label: this.$t("unfavourite"),
          icon: Star,
          onClick: () => {
            this.$resources.toggleFavourite.submit()
          },
          isEnabled: () => {
            return (
              this.selectedEntities?.length > 0 &&
              this.selectedEntities?.every((x) => x.is_favourite)
            )
          },
        },
      ].filter((item) => item.isEnabled())
    },
    fullName() {
      return this.$store.state.user.fullName
    },
    imageURL() {
      return this.$store.state.user.imageURL
    },
    isLoggedIn() {
      return this.$store.getters.isLoggedIn
    },
    connectedUsers() {
      return this.$store.state.connectedUsers
    },
    currentViewEntites() {
      return this.$store.state.currentViewEntites
    },
    canUpload() {
      if (
        (this.$route.name === "Home" || this.$route.name === "Notifications") &&
        this.$store.state.currentFolderID === this.$store.state.homeFolderID
      ) {
        return false
      }
      if (
        this.$store.state.currentFolder[0]?.owner === "You" ||
        this.$store.state.currentFolder[0]?.write === 1
      ) {
        return false
      }
      return true
    },
  },
  methods: {
    handleSelectedEntity() {
      if (this.$route.name === "Folder") {
        return this.$store.commit(
          "setEntityInfo",
          this.$store.state.currentFolder
        )
      }
    },
  },
  resources: {
    createDocument() {
      return {
        url: "drive.api.files.create_document_entity",
        onSuccess(data) {
          data.modified = formatDate(data.modified)
          data.creation = formatDate(data.creation)
          this.$store.commit("setEntityInfo", [data])
          this.previewEntity = data
          data.owner = "You"
        },
        onError(data) {
          console.log(data)
        },
        auto: false,
      }
    },
    toggleFavourite() {
      return {
        method: "POST",
        auto: false,
        url: "drive.api.files.add_or_remove_favourites",
        params: {
          entity_names: JSON.stringify(
            this.selectedEntities?.map((entity) => entity.name)
          ),
        },
        onSuccess() {
          this.$store.state.entityInfo[0].is_favourite =
            !this.$store.state.entityInfo[0].is_favourite
        },
      }
    },
  },
}
</script>
