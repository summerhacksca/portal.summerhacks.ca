/**
 * Inline decorative glyphs from the Hacker Portal design mockup - a small
 * "orange" and "apple" fruit motif reused across the hero, section headers,
 * and footer. `color` recolors the fruit body, `stemColor` the stem/leaf;
 * the white highlight shapes are fixed as part of the artwork.
 */

export function OrangeGlyph({
	size = 16,
	color = "var(--orange)",
	stemColor = "var(--green)",
	className,
	style,
}: {
	size?: number;
	color?: string;
	stemColor?: string;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 104 120"
			className={className}
			style={{ flexShrink: 0, ...style }}
			aria-hidden="true"
		>
			<rect x="47.6431" width="6.20653" height="23.5483" rx="2.73818" fill={stemColor} />
			<path
				d="M63.0329 2.37274C68.8018 2.26081 72.9026 5.20043 74.7144 6.81707C75.343 7.37793 75.3371 8.31084 74.7211 8.88547C72.7699 10.7056 68.266 14.2649 63.0329 14.0922C56.0168 13.8608 50.9282 7.22993 50.9282 7.22993C50.9282 7.22993 55.0916 2.5268 63.0329 2.37274Z"
				fill={stemColor}
			/>
			<circle cx="51.6603" cy="67.3592" r="51.6603" fill={color} />
			<path
				d="M14.8597 60.5692C14.8081 56.4171 16.0602 54.1461 18.1608 54.2508C20.2613 54.3555 21.565 55.7724 21.5134 60.5692C21.4618 65.3661 20.1157 66.97 18.1608 66.965C16.2058 66.9601 14.9113 64.7214 14.8597 60.5692Z"
				fill="white"
			/>
			<path
				d="M8.50275 76.8256C8.45119 72.6735 9.70326 70.4024 11.8038 70.5071C13.9044 70.6118 15.2081 72.0287 15.1565 76.8256C15.1049 81.6224 13.7588 83.2264 11.8038 83.2214C9.84884 83.2164 8.55432 80.9777 8.50275 76.8256Z"
				fill="white"
			/>
			<path
				d="M19.4566 86.3036C18.6137 82.2376 19.4094 79.7694 21.4914 79.4714C23.5733 79.1733 25.1234 80.3154 25.988 85.034C26.8527 89.7526 25.8374 91.5839 23.9174 91.9521C21.9973 92.3202 20.2994 90.3696 19.4566 86.3036Z"
				fill="white"
			/>
		</svg>
	);
}

export function AppleGlyph({
	size = 16,
	color = "var(--terracotta)",
	stemColor = "var(--green)",
	className,
	style,
}: {
	size?: number;
	color?: string;
	stemColor?: string;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 99 106"
			className={className}
			style={{ flexShrink: 0, ...style }}
			aria-hidden="true"
		>
			<rect x="45.499" width="5.90508" height="22.4046" rx="2.60518" fill={stemColor} />
			<path
				d="M56.1975 8.03041C60.7958 5.03153 65.5866 5.33587 67.8636 5.72678C68.6535 5.8624 69.1191 6.61809 68.9118 7.39231C68.2551 9.84469 66.4156 14.9872 62.1063 17.4864C56.3286 20.837 48.8797 18.0524 48.8797 18.0524C48.8797 18.0524 49.8677 12.1586 56.1975 8.03041Z"
				fill={stemColor}
			/>
			<path
				d="M98.3022 56.5036C98.3022 83.649 76.2965 105.655 49.1511 105.655C22.0057 105.655 0 83.649 0 56.5036C0 7.10865 30.2907 18.7203 49.1511 18.7203C68.0115 18.7203 98.3022 7.58227 98.3022 56.5036Z"
				fill={color}
			/>
			<path
				d="M81.6635 43.9176C79.9669 36.2268 80.51 31.7076 82.965 31.3888C85.42 31.07 87.4767 33.3803 89.3091 42.2924C91.1415 51.2046 90.2273 54.5091 87.9789 54.9774C85.7305 55.4456 83.3602 51.6083 81.6635 43.9176Z"
				fill="white"
			/>
		</svg>
	);
}
