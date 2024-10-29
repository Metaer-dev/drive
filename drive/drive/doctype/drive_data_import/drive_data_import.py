# Copyright (c) 2024, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

# from frappe.core.doctype.data_import.importer import Importer


class DriveDataImport(Document):
    pass


@frappe.whitelist()
def get_preview_from_template(reference_doctype, file_path, drive_data_import_name):
    drive_data_import = frappe.get_doc("Drive Data Import", drive_data_import_name)
    drive_data_import.check_permission("read")
    from ....api.importer import get_importer

    importer, _ = get_importer(
        doctype=reference_doctype,
        file_path=file_path,
        import_type="Insert",
        drive_data_import=drive_data_import,
        submit_after_import=False,
        console=False,
    )
    import_preview = importer.get_data_for_import_preview()
    return import_preview


@frappe.whitelist()
def get_import_logs(drive_data_import: str):
    doc = frappe.get_doc("Drive Data Import", drive_data_import)
    doc.check_permission("read")
    logs = frappe.get_all(
        "Data Import Log",
        fields=["success", "docname", "messages", "exception", "row_indexes"],
        filters={"data_import": drive_data_import},
        limit_page_length=5000,
        order_by="log_index",
    )
    return logs
