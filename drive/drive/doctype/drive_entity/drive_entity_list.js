frappe.listview_settings["Drive Entity"] = {
  get_indicator(doc) {
    let doc_status = doc.status;

    if (doc_status == "Not Validated Not Imported") {
      return [
        "Not Validated Not Imported",
        "gray",
        "status,=,Not Validated Not Imported",
      ];
    }

    if (doc_status == "Imported Not Validated") {
      return [
        "Imported Not Validated",
        "red",
        "status,=,Imported Not Validated",
      ];
    }

    if (doc_status == "Validated Not Imported") {
      return [
        "Validated Not Imported",
        "yellow",
        "status,=,Validated Not Imported",
      ];
    }

    if (doc_status == "Validated And Imported") {
      return [
        "Validated And Imported",
        "green",
        "status,=,Validated And Imported",
      ];
    }
  },
};
