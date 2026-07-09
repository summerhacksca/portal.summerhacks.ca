import type { Metadata } from "next";
import "./globals.css";

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
		<html lang="en">
			<body className="antialiased">
				{children}
			</body>
		</html>
	);
}
