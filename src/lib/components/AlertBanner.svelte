<script lang="ts">
	export let kind: 'success' | 'info' | 'warning' | 'error' = 'info';

	const kindClass = (value: typeof kind) => {
		switch (value) {
			case 'success':
				return 'alert-success';
			case 'warning':
				return 'alert-warning';
			case 'error':
				return 'alert-error';
			default:
				return 'alert-info';
		}
	};
</script>

<div role="alert" class={`alert ${kindClass(kind)}`}>
	<slot />
</div>
