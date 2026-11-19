import React from 'react';
import {
  AudioLines, Bird, Brain, Brush, Castle, Compass, Crown, Dice5, Drama, Feather, Flag, Flame, Footprints, Gamepad2, Gem, Grid2x2Check, Grid3x3,
  HatGlasses, Headphones, Hourglass, KeyRound, Landmark, Layers3, LayoutGrid, Lightbulb, ListChecks, ListMusic, ListOrdered, Map as MapIcon,
  MapPinned, MessageCircle, MessageSquareOff, MicVocal, Music2, Piano, Puzzle, Repeat, Route, ScrollText, Shapes, Shirt, SpellCheck, TextSearch,
  TicketCheck, UserRoundSearch, VenetianMask, Waves,
} from 'lucide-react';

// Every game's mark in the hub (data/games.ts ids) — the old list's cards and the new look's rows share it.
export const GAME_ICON: Record<string, React.ReactNode> = {
  'dghis-hangi': <Headphones />, 'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />,
  'okros-khana': <MapIcon />, 'samshvildis-ghame': <Castle />, 'saidanaa-simghera': <MapPinned />, 'otkhidan-erti': <ListChecks />, 'khma-khmad': <AudioLines />, 'sam-notshi': <Music2 />, 'khmebis-turniri': <MicVocal />, 'kartuli-akordi': <Piano />, 'rva-khma': <Waves />, 'rukis-viktorina': <Compass />, gagrdzele: <ListMusic />, hangebi: <Puzzle />, eqo: <Repeat />, 'mprinavi-notebi': <Bird />, 'khmis-tsqvilebi': <Grid2x2Check />, 'mesame-khma': <Layers3 />, 'chemi-gundi': <Drama />, chamotvale: <ListOrdered />, 'asoebis-bade': <TextSearch />, 'khutsuri-tsartsera': <ScrollText />, 'drois-khazi': <Hourglass />, 'chaitsvi-qartulad': <Shirt />, 'sami-damtserloba': <Feather />, 'tsikhis-gasaghebi': <KeyRound />, 'tsinapris-gza': <Footprints />, 'nu-itqvi': <MessageSquareOff />, 'erti-minishneba': <Lightbulb />, pantomima: <VenetianMask />, 'vin-var-me': <UserRoundSearch />, 'saidumlo-sakhelebi': <Grid3x3 />, 'utskho-sopelshi': <HatGlasses />, nakhatobana: <Brush />, 'sagalobo-loto': <TicketCheck />, 'sagandzuris-dzebna': <Gem />, 'ezos-msaji': <Flag />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

export const gameIcon = (id: string): React.ReactNode => GAME_ICON[id] ?? <Gamepad2 />;
