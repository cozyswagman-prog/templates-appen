// Samma globala miljö som tools/render-project.cjs ger renderaren i Node. Måste importeras före mallfilerna.
// Workers inbyggda Event har skrivskyddad eventPhase och fungerar inte med linkedom, därför linkedoms Event.
import { DOMParser, Event } from 'linkedom/worker';
globalThis.window = globalThis;
globalThis.DOMParser = DOMParser;
globalThis.Event = Event;
