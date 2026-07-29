import type { Metadata } from "next";
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
