<template>
  <div id="fileSelection" class="hidden" />
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, inject, watch } from "vue"
import { useStore } from "vuex"
import { useRoute } from "vue-router"
import Dropzone from "dropzone"
import { capture } from "@/telemetry"
import { useI18n } from "vue-i18n"

const store = useStore()
const route = useRoute()
const { t } = useI18n()

const stopCode = [417, 404, 403] // Set to immediately stop retrying uploads if this error code is encountered

const dropzone = ref()
const computedFullPath = ref("")
const emitter = inject("emitter")
const uploadResponse = ref("")

watch(route, (to) => {
  if (to.name === "Document") {
    dropzone.value.removeEventListeners()
  } else {
    dropzone.value.setupEventListeners()
  }
})

function doesRootFolderFullPathExist(k, file_parent) {
  const url =
    window.location.origin +
    "/api/method/" +
    `drive.api.files.does_entity_exist?name=${k}&parent_entity=${file_parent}`

  const xhr = new XMLHttpRequest()
  // third parameter false for a synchronous request
  xhr.open("GET", url, false)
  xhr.send()

  if (xhr.status === 200) {
    const json = JSON.parse(xhr.responseText)
    return json.message
  } else {
    throw new Error(t("request-failed", { status: xhr.status }))
  }
}

function rootFolderFullPathNewName(k, file_parent) {
  const url =
    window.location.origin +
    "/api/method/" +
    `drive.utils.files.get_new_title?title=${k}&parent_name=${file_parent}&folder=${true}}`

  const xhr = new XMLHttpRequest()
  xhr.open("GET", url, false) // Here i am seeting third parameter as false for a synchronous request
  xhr.send()

  if (xhr.status === 200) {
    const json = JSON.parse(xhr.responseText)
    return json.message
  } else {
    throw new Error(t("request-failed", { status: xhr.status }))
  }
}

function rootFolderFullPath(full_path) {
  let s = full_path
  let k = s.substring(0, s.indexOf("/"))
  return k
}

function newFullPathName(k, s, x) {
  let f = x.replace(k, s)
  return f
}

function NonMergeMode(file) {
  let a
  let s
  if (file.webkitRelativePath) {
    a = file.webkitRelativePath
  } else {
    a = file.fullPath
  }
  let k = rootFolderFullPath(a)
  let t = doesRootFolderFullPathExist(k, file.parent)
  if (t) {
    s = rootFolderFullPathNewName(k, file.parent)
    let z = newFullPathName(k, s, a)
    file.newFullPath = z
  } else {
    file.newFullPath = a
    s = k
  }
  return s
}

onMounted(() => {
  dropzone.value = new Dropzone("div#dropTarget", {
    paramName: "file",
    parallelUploads: 1,
    autoProcessQueue: false,
    clickable: "#fileSelection",
    disablePreviews: true,
    createImageThumbnails: false,
    retryChunksLimit: 5,
    previewsContainer: "#dropTarget",
    hiddenInputContainer: "#fileSelection",
    uploadMultiple: false,
    chunking: true,
    retryChunks: false,
    forceChunking: true,
    url: "/api/method/drive.api.files.upload_file",
    dictUploadCanceled: t("upload-canceled-by-user"),
    maxFilesize: 10 * 1024, // 10GB
    timeout: 120000, // 2 minutes
    chunkSize: 20 * 1024 * 1024, // 20MB
    headers: {
      "X-Frappe-CSRF-Token": window.csrf_token,
      Accept: "application/json",
    },
    accept: function (file, done) {
      if (file.size == 0) {
        done(t("empty-files-will-not-be-uploaded"))
      } else {
        done()
      }
    },
    sending: function (file, xhr, formData) {
      if (file.lastModified) {
        formData.append("last_modified", file.lastModified)
      }
      if (file.parent) {
        formData.append("parent", file.parent)
      }
      if (file.newFullPath) {
        formData.append("fullpath", file.newFullPath)
      } else if (file.webkitRelativePath) {
        formData.append("fullpath", file.webkitRelativePath)
      } else if (file.fullPath) {
        formData.append("fullpath", file.fullPath)
      }
    },
    params: function (files, xhr, chunk) {
      if (chunk) {
        return {
          uuid: chunk.file.upload.uuid,
          chunk_index: chunk.index,
          total_file_size: chunk.file.size,
          chunk_size: dropzone.value.options.chunkSize,
          total_chunk_count: chunk.file.upload.totalChunkCount,
          chunk_byte_offset: chunk.index * dropzone.value.options.chunkSize,
        }
      }
    },
  })
  dropzone.value.on("addedfile", function (file) {
    file.parent = store.state.currentFolderID
    store.commit("pushToUploads", {
      uuid: file.upload.uuid,
      name: file.name,
      progress: 0,
    })
    if (dropzone.value.files.length === 1) {
      if (file.fullPath || file.webkitRelativePath) {
        computedFullPath.value = NonMergeMode(file)
      }
      dropzone.value.options.autoProcessQueue = true
    }
    if (file.fullPath || file.webkitRelativePath) {
      let a
      if (file.webkitRelativePath) {
        a = file.webkitRelativePath
      } else {
        a = file.fullPath
      }
      let k = rootFolderFullPath(a)
      file.newFullPath = newFullPathName(k, computedFullPath.value, a)
    }
  })
  dropzone.value.on("queuecomplete", function () {
    dropzone.value.files = []
    computedFullPath.value = ""
    emitter.emit("fetchFolderContents")
  })

  dropzone.value.on("uploadprogress", function (file, progress) {
    store.commit("updateUpload", {
      uuid: file.upload.uuid,
      progress: progress,
    })
  })

  dropzone.value.on("error", function (file, response, xhr) {
    let message
    try {
      message = JSON.parse(JSON.parse(response._server_messages)[0]).message
    } catch (e) {}

    if (xhr) {
      const chunk = file.upload.chunks?.find((chunk) => !chunk.status)
      if (chunk) {
        chunk.retryCount = chunk.retryCount || 0

        if (xhr.status === 500 && chunk.retryCount < 5) {
          chunk.retryCount++
          message = t("server-error-retrying")
          setTimeout(() => dropzone.value.processFile(file), 1000)
        } else if (stopCode.includes(xhr.status)) {
          message =
            message || response || t("file-validation-failed-upload-rejected")
          dropzone.value.cancelUpload(file)
        } else {
          // Handling other server errors
          message =
            message ||
            response ||
            t("upload-failed-with-status", { status: xhr.status })
        }
      } else {
        // An error occurred after the file upload was completed (non-chunk related)
        if (stopCode.includes(xhr.status)) {
          message =
            message || response || t("file-validation-failed-upload-rejected")

          dropzone.value.cancelUpload(file) // stop uploadload
        } else {
          message =
            message ||
            response ||
            t("upload-failed-with-status", { status: xhr.status })
        }
      }
    } else {
      // Handling client errors (xhr does not exist)
      if (typeof response === "string") {
        message = response || t("client-side-upload-error")
      } else {
        try {
          message = response.message || t("upload-failed")
        } catch (e) {
          message = t("unknown-client-side-error-occurred")
        }
      }
    }

    store.commit("updateUpload", {
      uuid: file.upload.uuid,
      error: message,
    })
  })

  dropzone.value.on("success", function (file, response) {
    uploadResponse.value = response.message
    store.commit("updateUpload", {
      uuid: file.upload.uuid,
      response: response.message,
    })
  })

  // If the upload is complete, it is validated by the server, and if it fails, the upload is canceled
  dropzone.value.on("complete", function (file) {
    let xhr = file.xhr
    let message

    // Check the status code returned by the server in the complete event
    if (xhr && stopCode.includes(xhr.status)) {
      // if statuscode is in stopCode, then cancel upload
      try {
        message = JSON.parse(JSON.parse(response._server_messages)[0]).message
      } catch (e) {}
      message =
        message || response || t("file-validation-failed-upload-rejected")
      dropzone.value.cancelUpload(file)
      store.commit("updateUpload", {
        uuid: file.upload.uuid,
        error: message,
      })
    } else if (xhr && xhr.status === 200) {
      // if statuscode is 200, success
      message = t("file-upload-successful")
      store.commit("updateUpload", {
        uuid: file.upload.uuid,
        completed: true,
      })
      capture("new_file_uploaded")
    } else {
      // Handling other errors
      message = t("upload-failed-with-status-or-unknown", {
        status: xhr?.status || t("unknown"),
      })
      store.commit("updateUpload", {
        uuid: file.upload.uuid,
        error: message,
      })
    }
  })

  /*   emitter.on("directUpload", (file) => {
    dropzone.value.addFile(file)
    return directUplodEntityName.value
  }); */
  emitter.on("uploadFile", (extraData) => {
    dropzone.value.options.url = "/api/method/drive.api.files.upload_file"
    if (typeof extraData !== "undefined" && extraData?.validate) {
      // upload and validate file
      dropzone.value.options.url =
        "/api/method/drive.api.files.upload_file_and_validate_file"
    }
    if (typeof extraData !== "undefined" && extraData?.insert) {
      // insert records to doctype
      dropzone.value.options.url =
        "/api/method/drive.api.files.upload_file_and_insert_doctype"
    }
    if (typeof extraData !== "undefined" && extraData?.update) {
      // update records in doctype
      dropzone.value.options.url =
        "/api/method/drive.api.files.upload_file_and_update_doctype"
    }
    if (typeof extraData !== "undefined" && extraData?.cover) {
      // cover records in doctype
      dropzone.value.options.url =
        "/api/method/drive.api.files.upload_file_and_cover_doctype"
    }
    if (dropzone.value.hiddenFileInput) {
      dropzone.value.hiddenFileInput.removeAttribute("webkitdirectory") // By removing the webkitdirectory attribute, ensure that users can select only one file at a time
      dropzone.value.hiddenFileInput.click()
    }
  })
  emitter.on("cancelUpload", (uuid) => {
    var files = dropzone.value.files
    for (var i = 0; i < files.length; i++) {
      if (files[i].upload.uuid === uuid) {
        dropzone.value.removeFile(files[i])
      }
    }
  })
  emitter.on("cancelAllUploads", () => {
    dropzone.value.removeAllFiles(true)
  })
  emitter.on("uploadFolder", () => {
    if (dropzone.value.hiddenFileInput) {
      dropzone.value.hiddenFileInput.setAttribute("webkitdirectory", true)
      dropzone.value.hiddenFileInput.click()
    }
  })
})

onBeforeUnmount(() => {
  dropzone.value.destroy()
})
</script>
