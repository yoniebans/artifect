export const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
};

export const getArtifactPhase = (artifactTypeId: string): string => {
    const typeIdMap: Record<string, string> = {
        '1': 'Requirements',
        '2': 'Requirements',
        '3': 'Requirements',
        '4': 'Requirements',
        '5': 'Design',
        '6': 'Design',
        '7': 'Design',
    };

    return typeIdMap[artifactTypeId] || 'Unknown';
};