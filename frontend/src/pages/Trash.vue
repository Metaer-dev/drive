<template>
  <PageGeneric
    url="drive.api.list.files"
    :allow-empty-context-menu="false"
    :is-active="0"
    :show-sort="true"
    :icon="Trash"
    :primaryMessage="$t('trash-is-empty')"
    :secondaryMessage="''"
  />
</template>

<script setup>
import PageGeneric from "@/components/PageGeneric.vue"
import Trash from "../components/EspressoIcons/Trash.vue"
</script>
