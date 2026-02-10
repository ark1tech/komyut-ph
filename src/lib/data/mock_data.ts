import { mockPosts } from './mock_posts';
import { mockComments } from './mock_comments';

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const formatTimestamp = (iso: string): string => {
	const date = new Date(iso);
	const month = MONTHS[date.getUTCMonth()];
	const day = date.getUTCDate();
	const year = date.getUTCFullYear();
	const hours = String(date.getUTCHours()).padStart(2, '0');
	const minutes = String(date.getUTCMinutes()).padStart(2, '0');
	return `${month} ${day}, ${year} ${hours}:${minutes} UTC`;
};

const getLatestIso = (values: string[]): string => {
	return values.reduce((latest, current) => {
		return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
	});
};

export const getLatestMockActivity = (): {
	lastCreatedAt: string;
	lastEditedAt: string;
} => {
	const createdAtValues = [
		...mockPosts.map((post) => post.created_at),
		...mockComments.map((comment) => comment.created_at)
	];

	const editedAtValues = [
		...mockPosts.map((post) => post.last_edited),
		...mockComments.map((comment) => comment.last_edited)
	];

	const latestCreatedIso = getLatestIso(createdAtValues);
	const latestEditedIso = getLatestIso(editedAtValues);

	return {
		lastCreatedAt: formatTimestamp(latestCreatedIso),
		lastEditedAt: formatTimestamp(latestEditedIso)
	};
};
