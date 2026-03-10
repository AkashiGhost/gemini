export interface CreatorPublishReadiness {
  hasStoryPack: boolean;
  hasCoverImage: boolean;
}

export function canPublishCreatorStory(readiness: CreatorPublishReadiness): boolean {
  return readiness.hasStoryPack && readiness.hasCoverImage;
}

export function getCreatorPublishHint(readiness: CreatorPublishReadiness): string {
  if (!readiness.hasStoryPack) {
    return "Generate a Story Pack before publishing.";
  }
  if (!readiness.hasCoverImage) {
    return "Generate an image before publishing so onboarding has artwork.";
  }
  return "Ready to publish.";
}
