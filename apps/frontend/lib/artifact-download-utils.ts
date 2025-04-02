// apps/frontend/lib/artifact-download-utils.ts
import JSZip from 'jszip';
import { IPhase as Phase } from '@artifect/shared';

const sanitizeFileName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
        .replace(/\s+/g, '_')          // Replace spaces with underscores
        .trim();
};

const getFileExtension = (artifactType: string): string => {
    switch (artifactType.toLowerCase()) {
        case 'requirements':
            return '.md';
        case 'design':
            return '.mermaid';
        default:
            return '.txt';
    }
};

export const downloadArtifacts = async (phases: Phase[]) => {
    const zip = new JSZip();

    phases.forEach((phase) => {
        // Filter artifacts that are both approved and have content
        const approvedArtifacts = phase.artifacts.filter(
            (artifact) =>
                artifact.state_name === "Approved" &&
                artifact.artifact_version_content !== undefined &&
                artifact.artifact_version_content !== null
        );

        if (approvedArtifacts.length > 0) {
            const phaseFolder = zip.folder(sanitizeFileName(phase.name));

            if (phaseFolder) {
                approvedArtifacts.forEach((artifact) => {
                    // Since we filtered out undefined/null content above, we know this is safe
                    // But TypeScript doesn't know that, so we add a null check with default empty string
                    const content = artifact.artifact_version_content || '';
                    const fileName = `${sanitizeFileName(artifact.name)}_v${artifact.artifact_version_number || '1'}${getFileExtension(artifact.artifact_type_name)}`;
                    phaseFolder.file(fileName, content);
                });
            }
        }
    });

    // Generate and download the zip file
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "artifacts.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};