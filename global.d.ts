// global.d.ts
declare module "leaflet";
declare module "leaflet/dist/leaflet.css";
declare module "africastalking" {
	type Config = { apiKey: string; username: string; environment?: string };
	export default function AfricasTalking(config: Config): unknown;
}
