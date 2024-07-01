/**
 * WordPress dependencies
 */
import { backup } from '@wordpress/icons';
import { useDispatch } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { __, _n, sprintf, _x } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';
import { useState } from '@wordpress/element';
import {
	Button,
	__experimentalText as Text,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import type { Action } from '@wordpress/dataviews';
import type { StoreDescriptor } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	TEMPLATE_PART_POST_TYPE,
	TEMPLATE_POST_TYPE,
	TEMPLATE_ORIGINS,
} from '../../store/constants';
import { store as editorStore } from '../../store';
import { unlock } from '../../lock-unlock';
import type { Post, CoreDataError } from '../types';
import { isTemplateOrTemplatePart, getItemTitle } from './utils';

const resetPost: Action< Post > = {
	id: 'reset-post',
	label: __( 'Reset' ),
	isEligible: ( item ) => {
		return (
			isTemplateOrTemplatePart( item ) &&
			item?.source === TEMPLATE_ORIGINS.custom &&
			item?.has_theme_file
		);
	},
	icon: backup,
	supportsBulk: true,
	hideModalHeader: true,
	RenderModal: ( { items, closeModal, onActionPerformed } ) => {
		const [ isBusy, setIsBusy ] = useState( false );
		const { revertTemplate, removeTemplates } = unlock(
			useDispatch( editorStore as StoreDescriptor )
		);
		const { saveEditedEntityRecord } = useDispatch( coreStore );
		const { createSuccessNotice, createErrorNotice } =
			useDispatch( noticesStore );
		const onConfirm = async () => {
			try {
				if ( items[ 0 ].type === TEMPLATE_PART_POST_TYPE ) {
					await removeTemplates( items );
				} else {
					for ( const template of items ) {
						if ( template.type === TEMPLATE_POST_TYPE ) {
							await revertTemplate( template, {
								allowUndo: false,
							} );
							await saveEditedEntityRecord(
								'postType',
								template.type,
								template.id
							);
						}
					}
					createSuccessNotice(
						items.length > 1
							? sprintf(
									/* translators: The number of items. */
									__( '%s items reset.' ),
									items.length
							  )
							: sprintf(
									/* translators: The template/part's name. */
									__( '"%s" reset.' ),
									getItemTitle( items[ 0 ] )
							  ),
						{
							type: 'snackbar',
							id: 'revert-template-action',
						}
					);
				}
			} catch ( error ) {
				const typedError = error as CoreDataError;
				let fallbackErrorMessage;
				if ( items[ 0 ].type === TEMPLATE_POST_TYPE ) {
					fallbackErrorMessage =
						items.length === 1
							? __(
									'An error occurred while reverting the template.'
							  )
							: __(
									'An error occurred while reverting the templates.'
							  );
				} else {
					fallbackErrorMessage =
						items.length === 1
							? __(
									'An error occurred while reverting the template part.'
							  )
							: __(
									'An error occurred while reverting the template parts.'
							  );
				}
				const errorMessage =
					typedError.message && typedError.code !== 'unknown_error'
						? typedError.message
						: fallbackErrorMessage;

				createErrorNotice( errorMessage, { type: 'snackbar' } );
			}
		};
		return (
			<VStack spacing="5">
				<Text>
					{ __( 'Reset to default and clear all customizations?' ) }
				</Text>
				<HStack justify="right">
					<Button
						variant="tertiary"
						onClick={ closeModal }
						disabled={ isBusy }
						__experimentalIsFocusable
					>
						{ __( 'Cancel' ) }
					</Button>
					<Button
						variant="primary"
						onClick={ async () => {
							setIsBusy( true );
							await onConfirm();
							onActionPerformed?.( items );
							setIsBusy( false );
							closeModal?.();
						} }
						isBusy={ isBusy }
						disabled={ isBusy }
						__experimentalIsFocusable
					>
						{ __( 'Reset' ) }
					</Button>
				</HStack>
			</VStack>
		);
	},
};

export default resetPost;
