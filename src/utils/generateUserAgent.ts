import packageJson from '@package';

export default () => {
	return `${packageJson.name}/${packageJson.version}`;
}
