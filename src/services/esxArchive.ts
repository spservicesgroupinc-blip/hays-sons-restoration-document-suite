/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { EstimateProject } from '../types/xactimate';
import {
  generateProjectDataXml,
  generateManifestMeta,
  parseProjectDataXml,
} from './xactimateSchema';

/**
 * Sanitizes a filename to short, alphanumeric characters only
 * Prevents Windows MAX_PATH limits and Xactimate import rejections
 */
export function sanitizeEsxFilename(claimNumber: string, prefix = 'CLM'): string {
  const cleanNum = (claimNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const truncated = cleanNum.slice(0, 10);
  const stamp = Date.now().toString().slice(-4);
  const finalId = truncated ? `${truncated}${stamp}` : `${prefix}${stamp}`;
  // Ensure maximum length under 18 characters and strict alphanumeric + .esx
  const sanitized = finalId.slice(0, 14);
  return `${sanitized}.esx`;
}

/**
 * Packages an EstimateProject into a true PKZIP compressed .esx archive (ZIP_DEFLATED)
 * Contains:
 * - project_data.xml
 * - manifest.meta
 * - /metadata/profile.cfg
 */
export async function compileEsxArchive(project: EstimateProject): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  // 1. Serialize project XML
  const projectXml = generateProjectDataXml(project);
  zip.file('project_data.xml', projectXml, {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // 2. Generate manifest.meta
  const manifest = generateManifestMeta(project);
  zip.file('manifest.meta', manifest, {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // 3. Profile configuration
  const profile = (project.claim.profile || 'CONTRACTOR').toUpperCase().replace(/[^A-Za-z0-9_]/g, '');
  zip.file('profile.cfg', `PROFILE_ID=${profile}\nTARGET_SYS=VERISK_XACTIMATE\nSCHEMA_REV=1.0\n`, {
    compression: 'DEFLATE',
  });

  // Generate binary PKZIP blob with ZIP_DEFLATED
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/x-xactimate-esx',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  const filename = sanitizeEsxFilename(project.claim.claimNumber);
  return { blob, filename };
}

/**
 * Unpacks an uploaded .esx PKZIP archive and parses project_data.xml
 */
export async function unpackEsxArchive(file: File | Blob): Promise<{
  project: EstimateProject;
  filenames: string[];
  manifestText?: string;
  xmlRaw: string;
}> {
  const zip = new JSZip();
  let zipContent: JSZip;

  try {
    zipContent = await zip.loadAsync(file);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Invalid ESX Container Integrity: File is not a valid PKZIP archive (${message}). Ensure the file is not a renamed raw XML document.`
    );
  }

  const filenames = Object.keys(zipContent.files);

  // Look for project_data.xml, XACTDOC.ZIPXML, or any root .xml file
  const xmlCandidates = [
    'project_data.xml',
    'PROJECT_DATA.XML',
    'XACTDOC.ZIPXML',
    'xactdoc.zipxml',
    'project.xml',
    'estimate.xml',
  ];

  let xmlFile = filenames.find((f) => xmlCandidates.includes(f));
  if (!xmlFile) {
    xmlFile = filenames.find((f) => f.toLowerCase().endsWith('.xml'));
  }

  if (!xmlFile) {
    throw new Error(
      `ESX Container Missing Required Payload: No project_data.xml or schema XML document found inside container. Archive contents: [${filenames.join(', ')}]`
    );
  }

  const xmlRaw = await zipContent.files[xmlFile].async('string');

  let manifestText: string | undefined;
  const manifestFile = filenames.find((f) => f.toLowerCase().includes('manifest'));
  if (manifestFile) {
    manifestText = await zipContent.files[manifestFile].async('string');
  }

  // Parse into structured EstimateProject
  const project = parseProjectDataXml(xmlRaw);
  if (file instanceof File) {
    project.originalFileName = file.name;
  }

  return { project, filenames, manifestText, xmlRaw };
}

/**
 * Initiates browser download of an ESX archive
 */
export function downloadEsxFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
