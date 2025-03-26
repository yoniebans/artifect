import JSZip from 'jszip';
import { Phase } from '../types/artifact';

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
        const approvedArtifacts = phase.artifacts.filter(
            (artifact) => artifact.state_name === "Approved"
        );

        if (approvedArtifacts.length > 0) {
            const phaseFolder = zip.folder(sanitizeFileName(phase.name));

            if (phaseFolder) {
                approvedArtifacts.forEach((artifact) => {
                    const fileName = `${sanitizeFileName(artifact.name)}_v${artifact.artifact_version_number}${getFileExtension(artifact.artifact_type_name)}`;
                    phaseFolder.file(fileName, artifact.artifact_version_content);
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