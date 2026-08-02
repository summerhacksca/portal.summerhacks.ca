import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-space-mono",
});

export const metadata: Metadata = {
	title: "SummerHacks",
	description: "Build under open skies",
	icons: {
		icon: "/icon.svg",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	// Lets the bottom sheets pad themselves past the iPhone home indicator with
	// env(safe-area-inset-bottom) - without this the inset always resolves to 0.
	viewportFit: "cover",
	themeColor: "#fffbf6", // --sun-50, matches --surface-page
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={spaceMono.variable}>
			<body className="antialiased">
				{children}
			</body>
		</html>
	);
}
