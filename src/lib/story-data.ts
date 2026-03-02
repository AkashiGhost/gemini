export interface StoryMeta {
  id: string;
  title: string;
  hook: string;
  image: string;
  imageOrientation: "landscape" | "portrait";
  duration: string;
  genre: string;
  featured: boolean;
  comingSoon: boolean;
  playable: boolean;
}

export const STORIES: StoryMeta[] = [
  {
    id: "the-call",
    title: "The Call",
    hook: "A stranger calls from underground. You're their only way out.",
    image: "/images/stories/the-call/cover.png",
    imageOrientation: "portrait",
    duration: "10 min",
    genre: "thriller",
    featured: true,
    comingSoon: false,
    playable: true,
  },
  {
    id: "the-last-session",
    title: "The Last Session",
    hook: "Your last patient has arrived. She knows too much.",
    image: "/images/stories/the-last-session/card.webp",
    imageOrientation: "landscape",
    duration: "12 min",
    genre: "psychological horror",
    featured: false,
    comingSoon: false,
    playable: false,
  },
  {
    id: "the-lighthouse",
    title: "The Lighthouse",
    hook: "A storm. A radio. A voice that knows your name.",
    image: "/images/stories/the-lighthouse/card.webp",
    imageOrientation: "landscape",
    duration: "10 min",
    genre: "cosmic horror",
    featured: false,
    comingSoon: false,
    playable: false,
  },
  {
    id: "room-4b",
    title: "Room 4B",
    hook: "The door won't stay locked. The chart has your name.",
    image: "/images/stories/room-4b/card.webp",
    imageOrientation: "portrait",
    duration: "10 min",
    genre: "body horror",
    featured: false,
    comingSoon: false,
    playable: false,
  },
];

export const COMING_SOON_COUNT = 2;

export function getFeaturedStory(): StoryMeta {
  return STORIES.find((s) => s.featured) ?? STORIES[0];
}

export function getPlayableStories(): StoryMeta[] {
  return STORIES.filter((s) => !s.comingSoon && s.playable);
}
