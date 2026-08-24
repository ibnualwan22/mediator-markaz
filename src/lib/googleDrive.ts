import { google } from "googleapis";
import { Readable } from "stream";

// Retrieve environment variables
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
// Handle private key formatting: in .env, literal \n is used, so we replace it with actual newlines
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Define the scopes needed for full Drive access
const SCOPES = ["https://www.googleapis.com/auth/drive"];

/**
 * Initializes and returns the Google Drive API client
 */
export function getDriveClient() {
  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Drive credentials in environment variables.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Convert a Web File/Buffer to a Node.js Readable stream
 */
function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Gets a folder by name within a parent folder. Returns the ID if found, null otherwise.
 */
async function getFolderByName(
  drive: ReturnType<typeof getDriveClient>,
  folderName: string,
  parentId: string
) {
  try {
    const res = await drive.files.list({
      // We search for folder MIME type, matching name, exact parent, and not in trash
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(
        /'/g,
        "\\'"
      )}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error finding folder ${folderName}:`, error);
    throw error;
  }
}

/**
 * Creates a folder with the given name inside the parent folder. Returns the new folder ID.
 */
async function createFolder(
  drive: ReturnType<typeof getDriveClient>,
  folderName: string,
  parentId: string
) {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return res.data.id;
  } catch (error) {
    console.error(`Error creating folder ${folderName}:`, error);
    throw error;
  }
}

/**
 * Gets an existing folder or creates it if it doesn't exist.
 */
export async function getOrCreateFolder(
  drive: ReturnType<typeof getDriveClient>,
  folderName: string,
  parentId: string
) {
  let folderId = await getFolderByName(drive, folderName, parentId);
  if (!folderId) {
    folderId = await createFolder(drive, folderName, parentId);
  }
  return folderId;
}

/**
 * Orchestrates the creation of the nested folder structure: Periode > Gelombang > Santri
 * Returns the leaf folder ID (Santri's folder).
 */
export async function ensureSantriFolder(
  periode: string,
  gelombang: string,
  santriName: string
) {
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured in .env");
  }

  const drive = getDriveClient();

  // 1. Periode folder (e.g. "2026-2027")
  const periodeFolderId = await getOrCreateFolder(drive, periode, rootFolderId);
  if (!periodeFolderId) throw new Error("Failed to create/get Periode folder");

  // 2. Gelombang folder (e.g. "Gelombang 1")
  const gelombangFolderId = await getOrCreateFolder(drive, gelombang, periodeFolderId);
  if (!gelombangFolderId) throw new Error("Failed to create/get Gelombang folder");

  // 3. Santri folder (e.g. "Ahmad Fulan")
  const santriFolderId = await getOrCreateFolder(drive, santriName, gelombangFolderId);
  if (!santriFolderId) throw new Error("Failed to create/get Santri folder");

  return santriFolderId;
}

/**
 * Uploads a file buffer to a specific Google Drive folder.
 * Returns the created file's ID and webViewLink.
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
) {
  const drive = getDriveClient();
  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };
  const media = {
    mimeType,
    body: bufferToStream(fileBuffer),
  };

  try {
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    return res.data;
  } catch (error) {
    console.error(`Error uploading file ${fileName}:`, error);
    throw error;
  }
}
