import frappe
import os
from frappe.core.doctype.data_import.importer import Importer, ImportFile
from frappe import _


# class Importer_fix(ImportFile):
#     def read_file(self, file_path):
#         extn = os.path.splitext(file_path)[1][1:]

#         file_content = None

#         if not self.console:
#             file_content = read_file_as_binary(file_path, True)
#             return file_content, extn

#         return file_content, extn


def read_file_fix(self, file_path: str):
    extn = os.path.splitext(file_path)[1][1:]

    file_content = None

    if not self.console:
        file_content = read_file_as_binary(file_path, True)
        return file_content, extn

    return file_content, extn


def read_file_as_binary(path, raise_not_found=False):
    """Open a file and return its content as binary."""
    if isinstance(path, str):
        path = path.encode("utf-8")

    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    elif raise_not_found:
        raise OSError(f"{path} Not Found")
    else:
        return None


read_file = ImportFile.read_file


class ProxyImport:
    def __init__(self, real_import, after_action):
        self._real_import = real_import
        self._after_action = after_action

    def __getattr__(self, name):
        attr = getattr(self._real_import, name)
        if callable(attr):

            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                self._after_action()
                return result

            return wrapper
        return attr


def restore_import():
    ImportFile.read_file = read_file


def get_importer(
    doctype,
    file_path,
    import_type=None,
    drive_data_import=None,
    submit_after_import=False,
    console=False,
):
    """
    Import documents in from CSV or XLSX using data import.

    :param doctype: DocType to import
    :param file_path: Path to .csv, .xls, or .xlsx file to import
    :param import_type: One of "Insert" or "Update"
    :param submit_after_import: Whether to submit documents after import
    :param console: Set to true if this is to be used from command line. Will print errors or progress to stdout.
    """

    # Check if the document can be imported
    doc = frappe.get_doc("DocType", doctype)
    if not doc.allow_import:
        frappe.throw(_("The Doctype cannot be imported"))
    # get importer
    ImportFile.read_file = read_file_fix
    if not drive_data_import:
        # new 'Drive Data Import' doctype not 'Data Import'
        drive_data_import = frappe.new_doc("Drive Data Import")
        drive_data_import.submit_after_import = submit_after_import
        drive_data_import.reference_doctype = doctype
        drive_data_import.import_file = file_path
        drive_data_import.import_type = (
            "Insert New Records" if import_type.lower() == "insert" else "Update Existing Records"
        )
        drive_data_import.insert()
        frappe.db.commit()

    importer = Importer(
        doctype=doctype, file_path=file_path, data_import=drive_data_import, console=console
    )

    proxy_import = ProxyImport(importer, restore_import)

    return (
        proxy_import,
        drive_data_import,
    )
