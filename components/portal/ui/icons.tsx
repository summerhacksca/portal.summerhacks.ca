/**
 * Inline decorative glyphs from the Hacker Portal design mockup — a small
 * "orange" (ellipse) and "apple/pear" (leaf-topped teardrop) fruit motif
 * reused across the hero, section headers, and footer.
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
			viewBox="0 0 24 24"
			className={className}
			style={{ flexShrink: 0, ...style }}
			aria-hidden="true"
		>
			<ellipse cx="12" cy="13" rx="8.5" ry="8.5" fill={color} />
			<path
				d="M12 4.5c0-1.4 1-2 1.8-2.3"
				stroke={stemColor}
				strokeWidth="1.6"
				strokeLinecap="round"
				fill="none"
			/>
			<ellipse
				cx="9"
				cy="10"
				rx="1.4"
				ry="2"
				fill="rgba(255,255,255,0.35)"
				transform="rotate(-25 9 10)"
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
			viewBox="0 0 24 24"
			className={className}
			style={{ flexShrink: 0, ...style }}
			aria-hidden="true"
		>
			<path
				d="M12 22c-4.5 0-6.5-3.6-6.5-7.5C5.5 9.5 8.5 4 12 2c3.5 2 6.5 7.5 6.5 12.5C18.5 18.4 16.5 22 12 22Z"
				fill={color}
			/>
			<path
				d="M12 3c.3-1 1.1-1.6 2-1.8"
				stroke={stemColor}
				strokeWidth="1.4"
				strokeLinecap="round"
				fill="none"
			/>
			<ellipse
				cx="9.5"
				cy="9"
				rx="1.1"
				ry="1.7"
				fill="rgba(255,255,255,0.35)"
				transform="rotate(-20 9.5 9)"
			/>
		</svg>
	);
}
