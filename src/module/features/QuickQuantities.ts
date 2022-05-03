/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ModuleSettings from '../../../FVTT-Common/src/module/ModuleSettings';
import { CONTROL_QUANTITY, SHIFT_QUANTITY } from '../Setup';

export const setupQuantities = () => Hooks.on('renderActorSheet', onQuantitiesHook);

function onQuantitiesHook(app: ActorSheet, html: JQuery) {
    const increaseQuantity = html.find('.item-increase-quantity');
    const decreaseQuantity = html.find('.item-decrease-quantity');

    increaseQuantity.off('click');
    decreaseQuantity.off('click');

    const actor = app.actor as Actor;

    const getAmount = (event: JQuery.ClickEvent): number => {
        let amount = 1;
        if (event.shiftKey) amount *= ModuleSettings.instance.get(SHIFT_QUANTITY);
        if (event.ctrlKey) amount *= ModuleSettings.instance.get(CONTROL_QUANTITY);
        return amount;
    };

    increaseQuantity.on('click', (event) => {
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
        const item = actor.items.get(itemId) as Item;

        // @ts-ignore
        actor.updateEmbeddedDocuments('Item', [
            {
                '_id': itemId,
                'data.quantity': Number(item.data.data['quantity']) + getAmount(event),
            },
        ]);
    });

    decreaseQuantity.on('click', (event) => {
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
        const item = actor.items.get(itemId) as Item;

        if (Number(item.data.data['quantity']) > 0) {
            // @ts-ignore
            actor.updateEmbeddedDocuments('Item', [
                {
                    '_id': itemId,
                    'data.quantity': Number(item.data.data['quantity']) - getAmount(event),
                },
            ]);
        }
    });
}
